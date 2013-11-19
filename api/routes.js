var redis = require('redis')
  , _ = require('underscore')._
  , async = require('async')
  , read = require('./read')
  , collections = require('./lib/collections')
  , config = require('config')
  ;

var client = redis.createClient(config.redis.port, config.redis.address, {
  detect_buffers: true
});

function getState(req, res, next) {
  res.set('Access-Control-Allow-Origin', '*');
  var Multi = client.multi()
  Multi
    .llen('working')
    .llen('visited')
    .exec(function(err, replies) {
      if(err) return next(err);
      res.send(200, {working: (replies[0]/2), visited: replies[1]});
    });
}

function postStart(req, res, next) {
  res.set('Access-Control-Allow-Origin', '*');
  client.publish('actions','start');
  res.send(200, {});
}

function postStop(req, res, next) {
  res.set('Access-Control-Allow-Origin', '*');
  client.publish('actions','stop');
  res.send(200, {});
}

function postReset(req, res, next) {
  res.set('Access-Control-Allow-Origin', '*');
  var type = parseInt(req.body.type);
  if(!type || type < 0 || type > 2) type = 0;
  var Multi = client.multi()
  if(type == 0 || type == 2) {
    Multi
      .del('depth')
      .del('filter_body')
      .del('filter_title')
      .del('filter_url')
      .del('seed')
      ;
  }
  if(type == 0 || type == 1) {
    client.keys('links_*', function(err, links) {
      if(err) return next(err);
      _.each(links, function(link) {
        client.del(link);
      });
    });
    client.keys('keywords_*', function(err, links) {
      if(err) return next(err);
      _.each(links, function(link) {
        client.del(link);
      });
    });
    Multi
      .del('encoded_url')
      .del('visited')
      ;
  }
  Multi.exec(function(err, replies) {
    if(err) return next(err);
    res.send(204, {});
  });
}

function getSeed(req, res, next) {
  res.set('Access-Control-Allow-Origin', '*');
  client.lrange('seed', 0, -1, function(err, data) {
    if(err) return next(err);
    res.send(200,data);
  });
}

function postSeed(req, res, next) {
  res.set('Access-Control-Allow-Origin', '*');
  var url = req.body.url;
  if(!url) return next('You must specify an url to add.');
  res.send(201, {url: url});
  client.rpush('seed',url);
}

function deleteSeed(req, res, next) {
  res.set('Access-Control-Allow-Origin', '*');
  var url = req.query.url;
  if(!url) return next('You must specify an url to delete.');
  res.send(201, {url: url});
  client.lrem('seed',0,url);
}

function getFilter(req, res, next) {
  res.set('Access-Control-Allow-Origin', '*');
  async.parallel([
    function(callback) {
      client.smembers('filter_url', function(err, data) {
        callback(err,data);
      });
    },
    function(callback) {
      client.smembers('filter_title', function(err, data) {
        callback(err,data);
      });
    },
    function(callback) {
      client.smembers('filter_body', function(err, data) {
        callback(err,data);
      });
    }
  ], function(err, results) {
    if(err) return next(err);
    res.send(200,{
      url: results[0],
      title: results[1],
      body: results[2],
    });
  });
}

function postFilter(req, res, next) {
  res.set('Access-Control-Allow-Origin', '*');
  var keyword = req.body.keyword
    , target = req.body.target
    ;
  if(!keyword) return next('You must specify a keyword for the filter.');
  if(!target) return next('You must specify a target for the filter.');
  if(-1 == _.indexOf(['title','url','body'],target)) return next('You must specify a valid target for the filter.');
  res.send(201,{ keyword: keyword, target: target });
  client.sadd('filter_'+target,keyword);
}

function deleteFilter(req, res, next) {
  res.set('Access-Control-Allow-Origin', '*');
  var keyword = req.query.keyword
    , target = req.query.target;
  if(!keyword) return next('You must specify a keyword for the filter.');
  if(!target) return next('You must specify a target for the filter.');
  if(-1 == _.indexOf(['title','url','body'],target)) return next('You must specify a valid target for the filter.');
  res.send(201,{ keyword: keyword, target: target });
  client.srem('filter_'+target,keyword);
}

function getDepth(req, res, next) {
  res.set('Access-Control-Allow-Origin', '*');
  client.get('depth', function(err, data) {
    if(err) return next(err);
    res.send(200,{depth: data || 1});
  });
}

function postDepth(req, res, next) {
  res.set('Access-Control-Allow-Origin', '*');
  var depth = parseInt(req.body.depth);
  if(!depth || depth < 1) depth = 1;
  res.send(201, {});
  client.set('depth',depth);
}

function getCsv(req, res, next) {
  res.set('Access-Control-Allow-Origin', '*');
  read.read(client, function() {
    res.sendfile(__dirname + '/output.csv');
  });
}

function getKeywords(req, res, next) {
  res.set('Access-Control-Allow-Origin', '*');
  read.keywords(client, function() {
    res.sendfile(__dirname + '/output.csv');
  });
}

function getResults(req, res, next) {
  res.writeHead(200, {'content-type' : 'application/jsonstream'});
  collections.findNodes(function(cursor) {
    var stream = cursor.stream();
    stream.on('data', function(node) {
      console.log('Object');
      res.write(JSON.stringify(node) + '\n');
    });
    stream.on('close', function() {
      console.log('Stream end');
      res.end();
    });
  });
}

module.exports = {
  getState: getState,
  postStart: postStart,
  postStop: postStop,
  postReset: postReset,
  getSeed: getSeed,
  postSeed: postSeed,
  deleteSeed: deleteSeed,
  getFilter: getFilter,
  postFilter: postFilter,
  deleteFilter: deleteFilter,
  getDepth: getDepth,
  postDepth: postDepth,
  getCsv: getCsv,
  getKeywords: getKeywords,
  getResults: getResults
};

client.on('ready', function(){
  console.log('Connected to redis server !');
});
