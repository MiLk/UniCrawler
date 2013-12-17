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
  , CONFIG = require('config')
  , events = new EventEmitter()
  , is_running = false
  , config = {}
  , collections = require('./lib/collections')
  ;

// Connect to the redis database
var client = redis.createClient(CONFIG.redis.port, CONFIG.redis.address, {
  detect_buffers: true
});
var subscriber = redis.createClient(CONFIG.redis.port, CONFIG.redis.address, {
  detect_buffers: true
});


var handleWebPage = function(error, response, body, options) { // Get the response of the request
  var url = options.url
    , callback = options.callback
    , depth = options.depth
    ;
  if(error) {
    util.error('Scrapp error: ' + error);
    return callback();
  } else {
    if( response.headers['content-type'] &&
        ( !response.headers['content-type'].match(/html/)
        || !response.headers['content-type'].match(/text/))
      ) {
      util.error('Binary content-type');
      return callback();
    }

    if(response.statusCode == 200) {
      // Emit event in order to mark the url as visited
      events.emit('url_visited',url);

      // Body filter
      if(config.body.length > 0) {
        // Get matching keyword
        var found_body_keyword = _.reduce(config.body, function(memo, keyword) {
          if(body.search(new RegExp(keyword,"i")) != -1) {
            memo.push(keyword);
          }
          return memo;
        }, []);
      }
      if ( config.body.length == 0
        || depth == 0
        || (config.body.length > 0 && found_body_keyword && found_body_keyword.length > 0)
        ) {

        if(config.body.length > 0 && found_body_keyword && found_body_keyword.length > 0) {
          events.emit('keywords_found', url, found_body_keyword);
        }

        // Title filter
        if(config.title.length > 0) {
          var title = body.match(/<title>(.*)<\/title>/i);
          if(title && title[1]) {
            title = title[1];
            // Get matching keyword
            var found_title_keyword = _.reduce(config.title, function(memo, keyword) {
              if(title.search(new RegExp(keyword,"i")) != -1) {
                memo.push(keyword);
              }
              return memo;
            }, []);
          }
        }
        if ( config.title.length == 0
          || depth == 0
          || (config.title.length > 0 && found_title_keyword && found_title_keyword.length > 0)
          ) {

          if(config.title.length > 0 && found_title_keyword && found_title_keyword.length > 0) {
            events.emit('keywords_found', url, found_title_keyword);
          }

          if(config.depth >= depth) {
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

            // Reject link with no url or binary datas
            links = _.reject(links, function(link) {
              return ( link.url == ''
                    || link.url.match(/^mailto/)
                    || link.url.match(/\.(pdf|epub|gz|zip|rar|rpm)$/)
                    );
            });

            // Emit one event for each link
            _.each(links, function(link) {
              // URL filter
              if(config.url.length > 0) {
                // Get matching keyword
                var found_url_keyword = _.reduce(config.url, function(memo, keyword) {
                  if(link.url.toLowerCase().search(keyword) != -1) {
                    memo.push(keyword);
                  }
                  return memo;
                }, []);
              }
              if ( config.url.length == 0
                || (config.url.length > 0 && found_url_keyword && found_url_keyword.length > 0)
                ) {

                if(config.url.length > 0 && found_url_keyword && found_url_keyword.length > 0) {
                  events.emit('keywords_found', url, found_url_keyword);
                }

                if(config.depth == depth) {
                  client.hget('encoded_url', url, function(err, reply) {
                    // Node already seen
                    if(reply) {
                      // Send source url and link found
                      events.emit('link_found', url, link, (depth + 1));
                    }
                  });
                } else {
                  // Send source url and link found
                  events.emit('link_found', url, link, (depth + 1));
                }
              }
            });
          }
        }
      }
      return callback();
    } else {
      util.error('Scrapp error: request statusCode: ' + response.statusCode);
      return callback();
    }
  }
}

// Scrapp a website
function scrapp(url, depth, callback) {
  client.hget('encoded_url', url, function(err, reply) {
    if(reply) { // If we have already scrapped this page
      util.error('Scrapp: ' + url + ' already scrapped');
      return callback();
    } else {
      util.log('Scrapp: ' + url + ' ('+depth+')');
      collections.addNode({ url: url, depth: depth }, function(err) {
        if(err) util.error(err);
      });
      // Send a HTTP GET request
      request({ method: 'GET'
              , jar: false
              , uri: url
              }, function(error, response, body) {
                handleWebPage(error, response, body, {
                  url: url,
                  depth: depth,
                  callback: callback
                });
              });
    }
  });
}

function doScrapp() {
  client.exists('working', function(err, reply) {
    if(reply != 0) {
      var multi = client.multi();
      multi.blpop('working', 0);
      multi.blpop('working', 0);
      multi.exec(function(err, replies) {
        if(!replies[0]) {
          is_running = false;
          util.log('Stop crawling');
          return;
        }
        var url = replies[0].substr(8)
          , depth = parseInt(replies[1].substr(8));
        if(err) util.error('doScrapp error: ' + err);
        else scrapp(url, depth, function() {
          if(is_running)
            setTimeout(doScrapp, 0);
        });
      });
    } else {
      is_running = false;
      util.log('Stop crawling');
      return;
    }
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
    },
    function(callback) {
      client.get('depth', function(err, data) {
        callback(err,data || 1);
      });
    }
  ], function(err, results) {
    if(err) config_callback(err,null);
    else config_callback(null, {
      url: results[0],
      title: results[1],
      body: results[2],
      depth: results[3]
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
  if(is_running) {
    util.error('Crawler already running');
    return;
  }
  loadConfig(function(err, results) {
    if(err) util.error('Load Config: ' +err);
    config = results;
    // Load seed
    client.lrange('seed', 0, -1, function(err, results) {
      if(err) util.error('Get seed: ' +err);
      async.each(results, function(url,cb) {
        // Push the seed into working list
        client.rpush('working',url, 0, function(err) {
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
  util.log('Stop crawling');
});

/*
 *  link: { title, url }
 */
events.on('link_found', function(source, link, depth) {
  if(!link) return;
  var dst = resolve(source, link.url);
  events.emit('good_link_found', source, dst, depth);
  events.emit('link_to_follow', source, dst, depth);
});

// Add all link to the working list
// Link will be scrapped
events.on('link_to_follow', function(source, dst, depth) {
  if(is_running) {
    client.rpush('working',dst, depth, function(err, reply) {
      if(err) util.error('link_to_follow error: ' + err);
    });
  }
});

// Store the link between source and destination
// Useful to export to gephi
events.on('good_link_found', function(source, dst, depth) {
  collections.addLink(source,dst);
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

events.on('keywords_found', function(url, found_keyword) {
  found_keyword.forEach(function(keyword) {
    collections.addKeyword(url, keyword);
  });
});
