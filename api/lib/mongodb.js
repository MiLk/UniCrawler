var MongoClient = require('mongodb').MongoClient
  , config      = require('config')
  , util        = require('util')
  , events      = require('events')
  , mongodb = new events.EventEmitter()
  ;

mongodb.MongoClient = MongoClient;

MongoClient.connect(config.MongoDB, {
  db: {
    w: 1,
    native_parser: true
  }
},onMongoClientConnect);

function onMongoClientConnect(err, _db) {
  if(err) return util.error(err);
  util.log('MongoDB ready');
  mongodb.db = _db;
  mongodb.emit('ready');
  mongodb.db.collection('nodes').ensureIndex({ seq: 1 }, {sparse:true }, function(err) {
    if(err) console.error(err);
  });
};

module.exports = mongodb;
