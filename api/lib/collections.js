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

collections.listKeywords = function(callback) {
  mongodb.db.collection('nodes').aggregate([
    { $project: { keywords: 1 } },
    { $unwind: "$keywords" },
    { $sort: { keywords: 1 } },
    { $group: { _id: "$keywords" } }
  ], callback);
};

module.exports = collections;
