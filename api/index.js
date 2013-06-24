var restify = require('restify')
  , redis = require('redis')
  , util = require('util')
  , _ = require('underscore')._
  , async = require('async')
  ;

var client = redis.createClient(6379, '127.0.0.1', {
  detect_buffers: true
});

function getState(req, res, next) {
  res.set('Access-Control-Allow-Origin', '*');
  var Multi = client.multi()
  Multi
    .llen('working')
    .llen('visited')
    .exec(function(err, replies) {
      if(err) return next(new restify.InternalError(err));
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
  var type = parseInt(req.params.type);
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
      if(err) return next(new restify.InternalError(err));
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
    if(err) return next(new restify.InternalError(err));
    res.send(204, {});
  });
}

function getSeed(req, res, next) {
  res.set('Access-Control-Allow-Origin', '*');
  client.lrange('seed', 0, -1, function(err, data) {
    if(err) return next(new restify.InternalError(err));
    res.send(200,data);
  });
}

function postSeed(req, res, next) {
  res.set('Access-Control-Allow-Origin', '*');
  var url = req.params.url;
  if(!url) return next(new restify.MissingParameterError('You must specify an url to add.'));
  res.send(201, {url: url});
  client.rpush('seed',url);
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
    if(err) return next(new restify.InternalError(err));
    res.send(200,{
      url: results[0],
      title: results[1],
      body: results[2],
    });
  });
}

function postFilter(req, res, next) {
  res.set('Access-Control-Allow-Origin', '*');
  var keyword = req.params.keyword
    , target = req.params.target
    ;
  if(!keyword) return next(new restify.MissingParameterError('You must specify a keyword for the filter.'));
  if(!target) return next(new restify.MissingParameterError('You must specify a target for the filter.'));
  if(-1 == _.indexOf(['title','url','body'],target)) return next(new restify.MissingParameterError('You must specify a valid target for the filter.'));
  res.send(201,{ keyword: keyword, target: target });
  client.sadd('filter_'+target,keyword);
}


function getDepth(req, res, next) {
  res.set('Access-Control-Allow-Origin', '*');
  client.get('depth', function(err, data) {
    if(err) return next(new restify.InternalError(err));
    res.send(200,{depth: data || 1});
  });
}

function postDepth(req, res, next) {
  res.set('Access-Control-Allow-Origin', '*');
  var depth = parseInt(req.params.depth);
  if(!depth || depth < 1) depth = 1;
  res.send(201, {});
  client.set('depth',depth);
}

var server = restify.createServer({
  name: 'CrawlerAPI'
});
server.use(restify.queryParser());
server.use(restify.bodyParser());
server.pre(restify.pre.userAgentConnection());

/**
  * @method GET
  * @uri    /state
  *
  * Get the current state
  */
server.get('/state', getState);

/**
  * @method POST
  * @uri    /start
  *
  * Start the crawling process
  */
server.post('/start', postStart);
/**
  * @method POST
  * @uri    /stop
  *
  * Stop the crawling process
  */
server.post('/stop', postStop);
/**
  * @method POST
  * @uri    /reset
  * @params type   : Integer to specify data to delete
  *                  - 0 (default): Crawling datas and settings
  *                  - 1: Only crawling datas
  *                  - 2: Settings
  *
  * Reset all the datas and the current settings
  */
server.post('/reset', postReset);

/**
  * @method GET
  * @uri    /seed
  *
  * Return the seed list from current settings
  */
server.get('/seed', getSeed);
/**
  * @method POST
  * @uri    /seed
  * @params url   : Url to add as seed
  *
  * Add a seed in seed list
  */
server.post('/seed', postSeed);

/**
  * @method GET
  * @uri    /filter
  *
  * Return the filter list from current settings
  */
server.get('/filter', getFilter);
/**
  * @method POST
  * @uri    /filter
  * @params keyword : Keyword that must be present in scrapped pages
  * @params target  : Search the keyword in one of the following target: Page Title, URL, Body
  *
  * Add a filter
  */
server.post('/filter', postFilter);

/**
  * @method GET
  * @uri    /depth
  *
  * Return the max depth from current settings
  */
server.get('/depth', getDepth);
/**
  * @method POST
  * @uri    /depth
  * @params depth  : New depth
  *
  * Change the max depth where the crawling should stop
  */
server.post('/depth', postDepth);

server.listen(8081, function() {
  console.log('%s listening at %s', server.name, server.url);
});

client.on('ready', function(){
  console.log('Connected to redis server !');
});
