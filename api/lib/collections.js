var mongodb = require('./mongodb');

var collections = {};

collections.findNodes = function(query, cb) {
  if(!query) query = {};
  var cursor = mongodb.db.collection('nodes')
    .find(query, {})
    .sort({ seqId: 1 });
  return cb(cursor);
};

collections.dropNodes = function() {
  mongodb.db.collection('nodes').drop(function(err) {
    if(err) console.error(err);
  });
};

module.exports = collections;
