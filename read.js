var util = require('util')
  , fs = require('fs')
  , _ = require('underscore')._
  , redis = require('redis')
  , async = require('async')
  ;

// Connect to the redis database
var client = redis.createClient(6379, '127.0.0.1', {
  detect_buffers: true
});

// When redis is connected
client.on('ready', function(){
  client.hgetall('encoded_url', function(err, replies) {
    if(err) util.error(err);
    else {
      _.each(replies, function(encoded_url, url) {
        fs.appendFileSync('output.csv', url +';');
          
        client.lrange('links_'+encoded_url, 0, -1, function(err, replies) {
          if(err) util.error(err);
          else {
            _.each(replies, function(reply) {
              fs.appendFileSync('output.csv',reply+';');
            });
            fs.appendFileSync('output.csv',"\n");
          }
        });

      });
      
    }
  });
});