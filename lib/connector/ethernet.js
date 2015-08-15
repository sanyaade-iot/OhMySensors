var EverSocket = require('eversocket').EverSocket;
var EventEmitter = require('events').EventEmitter;

var EthernetConnector = function(ip, port) {
  var self = this;
  EventEmitter.call(this);
   
  var socket = new EverSocket({
    reconnectWait: 100
  });

  socket.on('connect', function onConnection() {
    self.emit('connection');
  });

  socket.on('data', function onData(data) {
    var text = data.toString();
    var exploded = text.split('\n');
    for (var i = 0; i < exploded.length; i++) {
      if(exploded[i] !== '') {
        self.emit('message', exploded[i]);
      }
    }
  });

  socket.on('close', function onDisconnection() {
    self.emit('disconnection');
  });

  socket.connect(port, ip);
};
require('util').inherits(Ethernet, EventEmitter);

EthernetConnector.prototype.send = function(message) {
  socket.write(message);
};

module.exports = EthernetConnector;