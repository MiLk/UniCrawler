var util = require('util')
  , fs = require('fs')
  , _ = require('underscore')._
  , cheerio = require('cheerio')
  , request = require('request')
  , redis = require('redis')
  , crypto = require('crypto')
  , EventEmitter = require('events').EventEmitter
  , events = new EventEmitter()
  ;

// Connect to the redis database
var client = redis.createClient(6379, '127.0.0.1', {
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
      events.emit('url_visited',url);          
      // Parse the raw HTML into exploitable format
      var $ = cheerio.load(body, {
          ignoreWhitespace: true,
          xmlMode: false,
          lowerCaseTags: false
      });
      // For each link found on the page
      $('a').each(function(){
        events.emit('link_found', url, $(this).attr('href'));
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
      setTimeout(doScrapp, 0);
    });
  });
}

// When redis is connected
client.on('ready', function(){
  // Push the seed
  client.rpush('working','http://fr.wikipedia.org');
  setTimeout(doScrapp, 0);
});

client.on('error', function(error) {
  util.error('Redis error: ' + error);
});

events.on('link_found', function(source, link) {
  if(!link) return;
  if(link.match(/^\/wiki\//)) {
    events.emit('internal_link_found', source, link);
  } else 
  if(link.match(/^\/\/([a-z]+)\.wikipedia\.org\//)) {
    // Other language links
  } else
  if(!link.match(/^#/)) {
    // External links
  }
  else {
    // Links we don't care
    // - #
    return;
  }
  events.emit('good_link_found', source, link);
});

// Add all link to the working list
// Link will be scrapped
events.on('internal_link_found', function(source,link) {
  client.rpush('working','http://fr.wikipedia.org'+link, function(err, reply) {
    if(err) util.error('link_found error: ' + err);
  });
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
})