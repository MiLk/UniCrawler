var mongodb = require('./mongodb');

var collections = {};

collections.findNodes = function(cb) {
  var cursor = mongodb.db.collection('nodes')
    .find({}, {});
  return cb(cursor);
};

module.exports = collections;
