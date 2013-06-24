var util = require('util')
  , fs = require('fs')
  , _ = require('underscore')._
  , async = require('async')
  ;

module.exports.read = function(client, cb) {
  client.hgetall('encoded_url', function(err, replies) {
    if(err) util.error(err);
    else {
      var output = [];
      replies = _.map(replies, function(val, key) { return [key, val]; });
      async.eachSeries(replies, function(reply, callback) {
        var links = [];
        client.lrange('links_'+reply[1], 0, -1, function(err, replies) {
          if(err) callback(err);
          else {
            async.eachSeries(replies, function(reply, callback2) {
              links.push(reply);
              callback2();
            }, function(err) {
              if(err) util.log(err);
              output.push([reply[0],links]);
              callback();
            });
          }
        });
      } , function(err) {
        if(err) util.log(err);
        if(fs.existsSync(__dirname + '/output.csv'))
          fs.unlinkSync(__dirname + '/output.csv');
        async.eachSeries(output, function(node, callback) {
          async.reduce(node[1], '', function(memo, item, rcb) {
            setImmediate(function() {
              if(memo != '')
                rcb(null, memo + ';' + item);
              else
                rcb(null, item);
            });
          }, function(err, result) {
            if(err) util.error(err);
            fs.appendFileSync(__dirname + '/output.csv', node[0] + ',' + result + "\n", {flag: 'a+'});
            callback();
          });
        }, function(err) {
          if(err) util.error(err);
          cb();
        });
      });
    }
  });
}