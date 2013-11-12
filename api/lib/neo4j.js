var neo4j = require('neo4j')
  , util = require('util')
  , config = require('config');

util.log(config.neo4j);
var db = new neo4j.GraphDatabase(config.neo4j);

module.exports.read = function() {
  var query = 'START n=node(*)'
            + 'MATCH (n)-[r]->(m)'
            + 'RETURN n as from, r as `->`, m as to;';
  util.log(query);
  db.query(query, {}, function(err, results) {
    if(err) util.error(err);
    util.log(util.inspect(results, true, 4, true));
  });
};

module.exports.read();
