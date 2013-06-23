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
  fs.unlinkSync('output.csv');
  client.hgetall('encoded_url', function(err, replies) {
    if(err) util.error(err);
    else {
      replies = _.map(replies, function(val, key) { return [key, val]; });
      async.eachSeries(replies, function(reply, callback) {
        client.lrange('links_'+reply[1], 0, -1, function(err, replies) {
          if(err) callback(err);
          else {
            async.eachSeries(replies, function(reply, callback2) {
              fs.appendFileSync('output.csv',reply+';');
              callback2();
            }, function(err) {
              if(err) util.log(err);
              callback();
            });
          }
          fs.appendFileSync('output.csv',"\n");
        });
      } , function(err) {
        if(err) util.log(err);
        process.exit(0);
      });
    }
  });
});