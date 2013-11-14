var mongodb = require('./mongodb');

var collections = {};

collections.addNode = function(node, cb) {
  if(!node.url) console.error('No url for this node.');
  if(!node.depth) console.error('No depth for this node.');
  mongodb.db.collection('nodes').update({
    _id: node.url
  }, {
    "$set": { depth: node.depth }
  }, { upsert: true }, cb);
};

collections.addLink = function(source, dst) {
  if(!source || !dst) return console.error('Please provide a source or a destination.');
  mongodb.db.collection('nodes').update({ _id: source }, {
    "$addToSet": {
      links: dst
    }
  }, { upsert: true }, function(err) {
    if(err) console.error(err);
  });
};

module.exports = collections;
