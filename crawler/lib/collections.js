var mongodb = require('./mongodb');

var collections = {};

collections.addNode = function(node, cb) {
  if(!node.url) console.error('No url for this node.');
  if(!node.depth && node.depth !== 0) console.error('No depth for this node ('+node.url+').');
  mongodb.db.collection('nodes').update({
    _id: node.url
  }, {
    "$set": { depth: node.depth }
  }, { upsert: true }, cb);
};

collections.addLink = function(source, dst) {
  if(!source || !dst) return console.error('Please provide a source and a destination.');
  mongodb.db.collection('nodes').update({ _id: source }, {
    "$addToSet": {
      links: dst
    }
  }, { upsert: true }, function(err) {
    if(err) console.error(err);
  });
};

collections.addKeyword = function(url, keyword) {
  if(!url || !keyword) return console.error('Please provide an url and a keyword.');
  mongodb.db.collection('nodes').update({ _id: url }, {
    "$addToSet": {
      keywords: keyword
    }
  }, { upsert: true }, function(err) {
    if(err) console.error(err);
  });
};

module.exports = collections;
