var path = require('path');
var logger = require('winston');
var WebSocketServer = require('ws').Server;

module.exports = function(db, ip, port) {
  //Connector

  var SerialProtocol = require('./serial-protocol');
  var EthernetConnector = require('./connector/ethernet');
  var Controller = require('./controller');

  var gateway = new EthernetConnector('192.168.0.3', 5003);
  var controller = new Controller(db, gateway);
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
      logger.debug('Message received: ' + JSON.stringify(parsedMessage, null, 4));
    } catch (e) {
      logger.error('Bad message received: ' + message);
    }

    if (parsedMessage) {
      controller.handle(parsedMessage, function onHandled(err) {
        if (err) { /* TODO */ }

        if (messageQueue.length > 0) {
          queue(null, true);
        } else {
          queueRunning = false;
        }
      });
    } else {
      if (messageQueue.length > 0) {
        queue(null, true);
      } else {
        queueRunning = false;
      }
    }
  }

  gateway.on('message', function onMessage(message) {
    queue(message);
  });

  // WebSocket server

  var httpServer = require('http').createServer();

  httpServer.on('error', function(err) {
    logger.error('HTTP server listening failed');
    process.exit(1);
  });

  httpServer.listen(port, ip, function() {
    logger.info('HTTP server listening at http://%s:%s', ip, port);
    var wss = new WebSocketServer({ server: httpServer });
    require('./server')(db, wss);
  });
};