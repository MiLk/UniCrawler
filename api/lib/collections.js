var mongodb = require('./mongodb');

var collections = {};

collections.findNodes = function(query, fields, cb) {
  if(!query) query = {};
  if(!fields) fields = {};
  var cursor = mongodb.db.collection('nodes')
    .find(query, fields)
    .sort({ seqId: 1 });
  return cb(cursor);
};

collections.dropNodes = function() {
  mongodb.db.collection('nodes').drop(function(err) {
    if(err) console.error(err);
  });
};

module.exports = collections;
