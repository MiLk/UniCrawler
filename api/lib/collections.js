var mongodb = require('./mongodb');

var collections = {};

collections.findNodes = function(cb) {
  var cursor = mongodb.db.collection('nodes')
    .find({}, {});
  return cb(cursor);
};

collections.dropNodes = function() {
  mongodb.db.collection('nodes').drop(function(err) {
    if(err) console.error(err);
  });
};

module.exports = collections;
