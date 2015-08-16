var path = require('path');
var express = require('express');
var nunjucks = require('nunjucks');
var logger = require('winston');
var app = express();

module.exports = function(db, ip, port) {
  nunjucks.configure(path.join(__dirname, '../view'), {
    express: app
  });

  app.use(express.static(path.join(__dirname, '../public')));

  // Setup routes

  app.use(function(req, res, next){
    if (!db.config.get('configured')) {
      if (req.path != '/setup') {
        return res.redirect('/setup');
      }
    }
    next();
  });

  app.get('/setup', function (req, res) {
    if (req.query.method && req.query.method == 'listserial') {
      var serialPort = require('serialport');
      serialPort.list(function(err, ports) {
        if (err) {
          //TODO
        }

        return res.json(ports);
      });
    } else {
      return res.render('setup.html');
    }
  });

  app.post('/setup', function (req, res) {
    
  });

  // Normal routes

  app.get('/', function (req, res) {
    res.send('TODO');
  });

  try {
    var server = app.listen(port, ip, function() {
      var host = server.address().address;
      var port = server.address().port;

      logger.info('HTTP server started at http://%s:%s', host, port);
    });
  } catch (e) {
    logger.error('HTTP server listening failed');
    process.exit(1);
  }
};