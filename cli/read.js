var read = require('../api/read')
  , redis = require('../api/node_modules/redis')
  ;

var client = redis.createClient(6379, '127.0.0.1', {
  detect_buffers: true
});

client.on('ready', function() {
  read.keywords(client, function() {
    process.exit(0);
  });
});
