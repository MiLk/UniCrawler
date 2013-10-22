var express = require('express')
  , server = express()
  , swagger = require("swagger-node-express")
  , models = require('./models')
  , routes = require('./routes')
  , url = require('url')
  ;

function errorHandler(err, req, res, next) {
  res.send(500,err);
}

server.use(express.bodyParser());
server.use(express.methodOverride());
server.use(errorHandler);
server.use(function(req, res, next){
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  if ('OPTIONS' == req.method) {
    res.set('Content-Type', 'application/json');
    res.send(204);
  } else {
    next();
  }
});

swagger.setAppHandler(server);
swagger.addModels(models);

swagger.addGet({
  'spec': {
    "description": "Get the current state",
    "summary": "Get the current state",
    "path": "/state",
    "method": "GET",
    "params": [],
    "responseClass": "State",
    "errorResponses": [],
    "nickname": "getState"
  },
  'action': routes.getState
});

swagger.addPost({
  'spec': {
    "description": "Start the crawling process",
    "summary": "Start the crawling process",
    "path": "/start",
    "method": "POST",
    "params": [],
    "errorResponses": [],
    "nickname": "postStart"
  },
  'action': routes.postStart
});
swagger.addPost({
  'spec': {
    "description": "Stop the crawling process",
    "summary": "Stop the crawling process",
    "path": "/stop",
    "method": "POST",
    "params": [],
    "errorResponses": [],
    "nickname": "postStop"
  },
  'action': routes.postStop
});
swagger.addPost({
  'spec': {
    "description": "Reset all the datas and the current settings",
    "summary": "Reset all the datas and the current settings",
    "notes": "With type 0, crawling datas and settings are deleted. <br />With type 1, only crawling datas.<br />With type 2, only settings.",
    "path": "/reset",
    "method": "POST",
    "params": [{
      "paramType": "body",
      "name": "type",
      "description": "Integer to specify data to delete",
      "dataType": "int",
      "defaultValue": 0,
      "allowableValues": {
        "valueType": "RANGE",
        "min": 0,
        "max": 2
      }
    }],
    "errorResponses": [],
    "nickname": "postReset"
  },
  'action': routes.postReset
});

swagger.addGet({
  'spec': {
    "description": "Return the seed list from current settings",
    "summary": "Return the seed list from current settings",
    "path": "/seed",
    "method": "GET",
    "params": [],
    "responseClass": "Array",
    "errorResponses": [],
    "nickname": "getSeed"
  },
  'action': routes.getSeed
});
swagger.addPost({
  'spec': {
    "description": "Add a seed in seed list",
    "summary": "Add a seed in seed list",
    "path": "/seed",
    "method": "POST",
    "params": [{
      "paramType": "body",
      "name": "url",
      "description": "Url to add as seed",
      "dataType": "string",
      "required": true
    }],
    "errorResponses": [],
    "nickname": "postSeed"
  },
  'action': routes.postSeed
});

swagger.addGet({
  'spec': {
    "description": "Return the filter list from current settings",
    "summary": "Return the filter list from current settings",
    "path": "/filter",
    "method": "GET",
    "params": [],
    "responseClass": "Filters",
    "errorResponses": [],
    "nickname": "getFilter"
  },
  'action': routes.getFilter
});
swagger.addPost({
  'spec': {
    "description": "Add a filter",
    "summary": "Add a filter",
    "path": "/filter",
    "method": "POST",
    "params": [{
      "paramType": "body",
      "name": "keyword",
      "description": "Keyword that must be present in scrapped pages",
      "dataType": "string",
      "required": true
    },{
      "paramType": "body",
      "name": "target",
      "description": "Search the keyword in one of the following target: Page Title, URL, Body",
      "dataType": "string",
      "required": true,
      "allowableValues": {
        "valueType": "LIST",
        "values": [
          "title",
          "url",
          "body"
        ]
      }
    }],
    "errorResponses": [],
    "nickname": "postFilter"
  },
  'action': routes.postFilter
});

swagger.addGet({
  'spec': {
    "description": "Return the max depth from current settings",
    "summary": "Return the max depth from current settings",
    "path": "/depth",
    "method": "GET",
    "params": [],
    "responseClass": "Depth",
    "errorResponses": [],
    "nickname": "getDepth"
  },
  'action': routes.getDepth
});
swagger.addPost({
  'spec': {
    "description": "Change the max depth where the crawling should stop",
    "summary": "Change the max depth where the crawling should stop",
    "path": "/depth",
    "method": "POST",
    "params": [{
      "paramType": "body",
      "name": "depth",
      "description": "New depth",
      "dataType": "int",
      "required": true
    }],
    "errorResponses": [],
    "nickname": "postDepth"
  },
  'action': routes.postDepth
});


server.get('/output.csv', routes.getCsv);
server.get('/keywords.csv', routes.getKeywords);

swagger.configureSwaggerPaths("", "/api-docs", "");
swagger.configure("http://ic05-api.emilienkenler.com", "0.1");

var docs_handler = express.static(__dirname + '/docs/');
server.get(/^\/docs(\/.*)?$/, function(req, res, next) {
  if (req.url === '/docs') { // express static barfs on root url w/o trailing slash
    res.writeHead(302, { 'Location' : req.url + '/' });
    res.end();
    return;
  }
  // take off leading /docs so that connect locates file correctly
  req.url = req.url.substr('/docs'.length);
  return docs_handler(req, res, next);
});

server.listen(8081, function() {
  console.log('Express listening at 0.0.0.0:%d',8081);
});
