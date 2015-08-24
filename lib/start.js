var logger = require('winston');
var WebSocketServer = require('ws').Server;

module.exports = function(db, ip, port) {
  //Connector

  var SerialProtocol = require('./serial-protocol');
  var Controller = require('./controller');
  var EventManager = require('./event-manager');

  var eventManager = new EventManager();
  var gateway;

  if (db.config.gateway.type === 'ethernet') {
    var EthernetConnector = require('./connector/ethernet');
    gateway = new EthernetConnector(db.config.gateway.ip, db.config.gateway.port);
  } else if (db.config.gateway.type === 'serial') {
    var SerialConnector = require('./connector/serial');
    gateway = new SerialConnector(db.config.gateway.path);
  } else {
    logger.error(`Unsupported gateway type: ${db.config.gateway.type}`);
    process.exit(1);
  }

  var controller = new Controller(db, eventManager, gateway);
  gateway.on('connection', function onConnection() {
    logger.info('Connected to gateway');
  });

  gateway.on('disconnection', function onDisconnection() {
    logger.info('Disconnected from gateway');
  });

  var messageQueue = [];
  var queueRunning = false;

  var queue = function(message, recur) {
    if (message) {
      messageQueue.push(message);
    }

    if (queueRunning && !recur) {
      return;
    } else {
      queueRunning = true;
    }

    var parsedMessage;
    try {
      parsedMessage = SerialProtocol.parse(messageQueue.shift());
      logger.debug('Message received: ' + JSON.stringify(parsedMessage, null, 2));
    } catch (e) {
      logger.error('Bad message received: ' + message);
    }

    if (parsedMessage) {
      controller.handle(parsedMessage).then(function onHandled() {
        if (messageQueue.length > 0) {
          queue(null, true);
        } else {
          queueRunning = false;
        }
      }).catch(function onError(err) {
        logger.error(`${err.stack}`);
      });
    } else {
      if (messageQueue.length > 0) {
        queue(null, true);
      } else {
        queueRunning = false;
      }
    }
  };

  gateway.on('message', function onMessage(message) {
    queue(message);
  });

  // HTTP / WebSocket server

  var path = require('path');
  var httpServer = require('http').createServer();
  var express = require('express');
  var app = express();

  app.use(express.static(path.join(__dirname, '../public')));

  httpServer.on('request', app);

  httpServer.on('error', function(err) {
    logger.error(`HTTP server listening failed: ${err.name}: ${err.message}`);
    process.exit(1);
  });

  httpServer.listen(port, ip, function() {
    logger.info('HTTP server listening at http://%s:%s', ip, port);
    var wss = new WebSocketServer({ server: httpServer });
    require('./server')(db, eventManager, gateway, wss).catch(function(err) {
      logger.error(`HTTP server crashed: ${err.name}: ${err.message}`);
      process.exit(1);
    });
  });
};