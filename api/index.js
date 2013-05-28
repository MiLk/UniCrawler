var restify = require('restify')
  , redis = require('redis')
  , util = require('util')
  , _ = require('underscore')._
  , async = require('async')
  ;

var client = redis.createClient(6379, '127.0.0.1', {
  detect_buffers: true
});

function postStart(req, res, next) {
  res.send(200, {});
}

function postStop(req, res, next) {
  res.send(200, {});
}

function postReset(req, res, next) {
  res.send(200, {});
}

function getSeed(req, res, next) {
  client.lrange('seed', 0, -1, function(err, data) {
    if(err) return next(new restify.InternalError(err));
    res.send(200,data);
  });
}

function postSeed(req, res, next) {
  var url = req.params.url;
  if(!url) return next(new restify.MissingParameterError('You must specify an url to add.'));
  res.send(201, {url: url});
  client.rpush('seed',url);
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
    if(err) return next(new restify.InternalError(err));
    res.send(200,{
      url: results[0],
      title: results[1],
      body: results[2],
    });
  });
}

function postFilter(req, res, next) {
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
  res.send(200, {});
}

function postDepth(req, res, next) {
  res.send(200, {});
}

var server = restify.createServer({
  name: 'CrawlerAPI'
});
server.use(restify.queryParser());
server.use(restify.bodyParser());
server.pre(restify.pre.userAgentConnection());

server.post('/start', postStart);
server.post('/stop', postStop);
server.post('/reset', postReset);

server.get('/seed', getSeed);
server.post('/seed', postSeed);

server.get('/filter', getFilter);
server.post('/filter', postFilter);

server.get('/depth', getDepth);
server.post('/depth', postDepth);

server.listen(8080, function() {
  console.log('%s listening at %s', server.name, server.url);
});

client.on('ready', function(){
  console.log('Connected to redis server !');
});