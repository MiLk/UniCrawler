var redis = require('redis')
  , _ = require('underscore')._
  , async = require('async')
  , collections = require('./lib/collections')
  , config = require('config')
  ;

var client = redis.createClient(config.redis.port, config.redis.address, {
  detect_buffers: true
});

function getState(req, res, next) {
  var Multi = client.multi()
  Multi
    .llen('working')
    .llen('visited')
    .exec(function(err, replies) {
      if(err) return next(err);
      res.send(200, {working: (replies[0]/2), visited: replies[1]});
    });
    // TODO Return crawl status - see #20
}

function postStart(req, res, next) {
  client.publish('actions','start');
  res.send(200, {});
}

function postPause(req, res, next) {
  client.publish('actions','stop');
  res.send(200, {});
}

function postStop(req, res, next) {
  client.publish('actions','stop');
  var Multi = client.multi();
  Multi
    .del('working')
  ;
  Multi.exec(function(err, replies) {
    if(err) return next(err);
    res.send(200, {});
  });
}

function postReset(req, res, next) {
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
    Multi
      .del('encoded_url')
      .del('visited')
      ;
    collections.dropNodes();
  }
  Multi.exec(function(err, replies) {
    if(err) return next(err);
    res.send(204, {});
  });
}

function getSeed(req, res, next) {
  client.lrange('seed', 0, -1, function(err, data) {
    if(err) return next(err);
    res.send(200,data);
  });
}

function postSeed(req, res, next) {
  var url = req.body.url;
  if(!url) return next('You must specify an url to add.');
  res.send(201, {url: url});
  client.rpush('seed',url);
}

function deleteSeed(req, res, next) {
  var url = req.query.url;
  if(!url) return next('You must specify an url to delete.');
  res.send(201, {url: url});
  client.lrem('seed',0,url);
}

function getFilter(req, res, next) {
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
      body: results[2]
    });
  });
}

function postFilter(req, res, next) {
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
  var keyword = req.query.keyword
    , target = req.query.target;
  if(!keyword) return next('You must specify a keyword for the filter.');
  if(!target) return next('You must specify a target for the filter.');
  if(-1 == _.indexOf(['title','url','body'],target)) return next('You must specify a valid target for the filter.');
  res.send(201,{ keyword: keyword, target: target });
  client.srem('filter_'+target,keyword);
}

function getDepth(req, res, next) {
  client.get('depth', function(err, data) {
    if(err) return next(err);
    res.send(200,{depth: parseInt(data) || 1});
  });
}

function postDepth(req, res, next) {
  var depth = parseInt(req.body.depth);
  if(!depth || depth < 1) depth = 1;
  res.send(201, {});
  client.set('depth',depth);
}

function getConfig(req,res, next) {
  async.parallel([
    function(callback) {
      client.lrange('seed', 0, -1, callback);
    },
    function(callback) {
      client.multi()
        .llen('working')
        .llen('visited')
        .get('depth')
        .exec(callback);
    },
    function(callback) {
      client.smembers('filter_url', callback);
    },
    function(callback) {
      client.smembers('filter_title', callback);
    },
    function(callback) {
      client.smembers('filter_body', callback);
    }
  ], function(err, results) {
    if(err) return next(err);
    res.send(200,{
      seeds: results[0],
      working: (results[1][0]/2),
      visited: parseInt(results[1][1]),
      depth: parseInt(results[1][2]) || 1,
      url: results[2],
      title: results[3],
      body: results[4]
    });
  });
}

function getResultsJson(req, res, next) {
  res.writeHead(200, {'content-type' : 'application/jsonstream'});
  var query = {};
  var lastSeqId = 0;
  var timeout = null;

  function onData(node) {
    lastSeqId = node.seqId;
    res.write(JSON.stringify(node) + '\n');
  };

  function onClose() {
    query = { 'seqId': { '$gt': lastSeqId } };
    timeout = setTimeout(getLastResults, 5000);
  }

  function getLastResults() {
    collections.findNodes(query, null, function(cursor) {
      var stream = cursor.stream();
      stream.on('data', onData);
      stream.on('close', onClose);
    });
  }

  process.nextTick(getLastResults);

  req.on('close', function() {
    clearTimeout(timeout);
    res.end();
  });
}

function getResultsGdf(req, res, next) {
  res.writeHead(200, {'content-type': 'application/octet-stream'});

  function writeNodeDef(callback) {
    res.write('nodedef>name VARCHAR,label VARCHAR\n');
    return callback();
  }

  function getNodes(callback) {
    function onData(node) {
      var str = "'" + node._id + "','" + node._id +"'";
      res.write(str + '\n');
    }
    function onClose() {
      return callback();
    }
    collections.findNodes(null,{
      "_id": 1
    },function(cursor) {
      var stream = cursor.stream();
      stream.on('data', onData);
      stream.on('close', onClose);
    });
  }

  function writeEdgeDef(callback) {
    res.write('edgedef>node1 VARCHAR,node2 VARCHAR\n');
    return callback();
  }

  function getEdges(callback) {
    function onData(node) {
      if(node.links)
        node.links.forEach(function(link) {
          var str = "'" + node._id + "','" + link +"'";
          res.write(str + '\n');
        });
    }

    function onClose() {
      return callback();
    }

    collections.findNodes(null,{
      "_id": 1,
      "links": 1
    },function(cursor) {
      var stream = cursor.stream();
      stream.on('data', onData);
      stream.on('close', onClose);
    });
  }

  async.series([writeNodeDef, getNodes,writeEdgeDef, getEdges], function(err, results) {
    res.end();
  });

}

function getKeywordsGdf(req, res, next) {
  res.writeHead(200, {'content-type': 'application/octet-stream'});

  function writeNodeDef(callback) {
    res.write('nodedef>name VARCHAR,label VARCHAR\n');
    return callback();
  }

  function getKeywords(callback) {
    collections.listKeywords(function(err, results) {
      if(err) return callback(err);
      results.forEach(function(keyword) {
        var str = "'" + keyword._id + "','" + keyword._id +"'";
        res.write(str + '\n');
      });
      return callback();
    });
  }

  function getNodes(callback) {
    function onData(node) {
      var str = "'" + node._id + "','" + node._id +"'";
      res.write(str + '\n');
    }
    function onClose() {
      return callback();
    }
    collections.findNodes(null,{
      "_id": 1
    },function(cursor) {
      var stream = cursor.stream();
      stream.on('data', onData);
      stream.on('close', onClose);
    });
  }

  function writeEdgeDef(callback) {
    res.write('edgedef>node VARCHAR, keyword VARCHAR\n');
    return callback();
  }

  function getEdges(callback) {
    function onData(node) {
      if(node.keywords)
        node.keywords.forEach(function(keyword) {
          var str = "'" + node._id + "','" + keyword +"'";
          res.write(str + '\n');
        });
    }

    function onClose() {
      return callback();
    }

    collections.findNodes(null,{
      "_id": 1,
      "keywords": 1
    },function(cursor) {
      var stream = cursor.stream();
      stream.on('data', onData);
      stream.on('close', onClose);
    });
  }

  async.series([writeNodeDef, getKeywords, getNodes,writeEdgeDef, getEdges], function(err, results) {
    res.end();
  });
}

module.exports = {
  getState: getState,
  postStart: postStart,
  postPause: postPause,
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
  getConfig: getConfig,
  getResultsJson: getResultsJson,
  getResultsGdf: getResultsGdf,
  getKeywordsGdf: getKeywordsGdf
};

client.on('ready', function(){
  console.log('Connected to redis server !');
});
