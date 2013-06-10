var util = require('util')
  , fs = require('fs')
  , urlparse = require('url').parse
  , resolve = require('url').resolve
  , _ = require('underscore')._
  , async = require('async')
  , request = require('request')
  , redis = require('redis')
  , crypto = require('crypto')
  , EventEmitter = require('events').EventEmitter
  , events = new EventEmitter()
  , is_running = false
  , config = {}
  ;

// Connect to the redis database
var client = redis.createClient(6379, '127.0.0.1', {
  detect_buffers: true
});
var subscriber = redis.createClient(6379, '127.0.0.1', {
  detect_buffers: true
});


var handleWebPage = function(error, response, body, options) { // Get the response of the request
  var url = options.url
    , callback = options.callback
    ;
  if(error) {
    util.error('Scrapp error: ' + error);
    return callback();
  } else {
    if(response.statusCode == 200) {
      // Emit event in order to mark the url as visited
      events.emit('url_visited',url);

      // Extract all the links from the body
      var links = body.match(/<a([^>]*)>(.+?)<\/a>/igm);

      // Extract url and title from all links
      links = _.map(links, function(link) {
        var url = link.match(/href="(.+?)"/i)
          , title = link.match(/<a(?:[^>]*)>(.+?)<\/a>/i);
        url = (url) ? url[1] : '';
        title = (title) ? title[1] : '-';
        return {
          title: title,
          url: url
        };
      });

      // Reject link with no url
      links = _.reject(links, function(link) {
        return ( link.url == ''
              || link.url.match(/^mailto/)
              );
      });

      // Emit one event for each link
      _.each(links, function(link) {
        if(config.url.length > 0) {
          var found_url_keyword = _.reduce(config.url, function(memo, keyword) {
            if(link.url.toLowerCase().search(keyword) != -1) {
              memo.push(keyword);
              return memo;
            }
          }, []);
        }
          util.log(util.inspect(found_url_keyword,true,4,true));
        if ( config.url.length == 0
          || (config.url.length > 0 && found_url_keyword && found_url_keyword.length > 0)
          ) {
          // Send source url and link found
          events.emit('link_found', url, link);
        }
      });

      return callback();
    } else {
      util.error('Scrapp error: request statusCode: ' + response.statusCode);
      return callback();
    }
  }
}

// Scrapp a website
function scrapp(url, callback) {
  client.hget('encoded_url', url, function(err, reply) {
    if(reply) { // If we have already scrapped this page
      util.log('Scrapp: ' + url + ' already scrapped');
      return callback();
    } else {
      // Send a HTTP GET request
      request({ method: 'GET'
              , jar: false
              , uri: url
              }, function(error, response, body) {
                handleWebPage(error, response, body, {
                  url: url,
                  callback: callback
                });
              });
    }
  });
}

function doScrapp() {
  client.blpop('working', 0, function(err, reply) {
    if(err) util.error('doScrapp error: ' + err);
    else scrapp(reply[1], function() {
      if(is_running)
        setTimeout(doScrapp, 0);
    });
  });
}

function loadConfig(config_callback) {
  async.parallel([
    function(callback) {
      client.smembers('filter_url', function(err, data) {
        callback(err,data);
      });
    },
    function(callback) {
      client.smembers('filter_title', function(err, data) {
        callback(err,data);
      });
    },
    function(callback) {
      client.smembers('filter_body', function(err, data) {
        callback(err,data);
      });
    }
  ], function(err, results) {
    if(err) config_callback(err,null);
    else config_callback(null, {
      url: results[0],
      title: results[1],
      body: results[2],
    });
  });
};

subscriber.on('message', function(channel, message) {
  switch(channel) {
    case 'actions': {
      events.emit(message);
    }; break;
    default:
      util.log('Received a message from channel '+channel+': '+message);
  }
});

subscriber.on('error', function(error) {
  util.error('Redis error: ' + error);
});

// When redis is connected
client.on('ready', function(){
  util.log('Redis connected');
  subscriber.subscribe('actions');
});

client.on('error', function(error) {
  util.error('Redis error: ' + error);
});

events.on('start', function() {
  loadConfig(function(err, results) {
    if(err) util.error('Load Config: ' +err);
    config = results;
    // Load seed
    client.lrange('seed', 0, -1, function(err, results) {
      if(err) util.error('Get seed: ' +err);
      async.each(results, function(url,cb) {
        // Push the seed into working list
        client.rpush('working',url, function(err) {
          cb(err);
        });
      }, function(err) {
        if(err) util.error('Initialize seed: '+err);
        is_running = true;
        util.log('Start crawling');
        setTimeout(doScrapp, 0);
      });
    });
  });
});

events.on('stop', function() {
  is_running = false;
  client.del('working', function(err) {
    if(err) util.error('Stop: ' +err);
    util.log('Stop crawling');
  });
});

/*
 *  link: { title, url }
 */
events.on('link_found', function(source, link) {
  if(!link) return;
  //util.log('Link found: ' + link.title + ' - ' + link.url);
  events.emit('good_link_found', source, link);
  events.emit('link_to_follow', source, link);
});

// Add all link to the working list
// Link will be scrapped
events.on('link_to_follow', function(source, link) {
  if(is_running) {
    var dst = resolve(source, link.url);
    //util.log(source + ' -> ' + link.url + ' : ' + dst);
    client.rpush('working',dst, function(err, reply) {
      if(err) util.error('link_to_follow error: ' + err);
    });
  }
});

// Store the link between source and destination
// Useful to export to gephi
events.on('good_link_found', function(source,link) {
  client.hget('encoded_url', source, function(err, encrypted_url) {
    if(err) util.error('good_link_found error: ' + err);
    else client.rpush('links_'+encrypted_url,link);
  });
});

events.on('url_visited', function(url) {
  var shasum = crypto.createHash('sha256');
  shasum.update(url);
  var encrypted_url = shasum.digest('hex');
  client.multi()
    .rpush(['visited',url]) // Mark url as visited
    .hsetnx(['encoded_url',url,encrypted_url]) // Create an unique hash string for each url
    .exec(function(err, replies) {
      if(err) util.error('Url visited error: ' + err);
    });
});
