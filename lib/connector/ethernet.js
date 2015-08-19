var EverSocket = require('eversocket').EverSocket;
var EventEmitter = require('events').EventEmitter;

var EthernetConnector = function(ip, port) {
  var self = this;
  EventEmitter.call(this);

  this.socket = new EverSocket({
    reconnectWait: 100
  });

  this.socket.on('connect', function onConnection() {
    self.emit('connection');
  });

  this.socket.on('data', function onData(data) {
    var text = data.toString();
    var exploded = text.split('\n');
    for (var i = 0; i < exploded.length; i++) {
      if(exploded[i] !== '') {
        self.emit('message', exploded[i]);
      }
    }
  });

  this.socket.on('close', function onDisconnection() {
    self.emit('disconnection');
  });

  this.socket.connect(port, ip);
};
require('util').inherits(EthernetConnector, EventEmitter);

EthernetConnector.prototype.send = function(message, cb) {
  this.socket.write(message, function() {
    return cb();
  });
};

module.exports = EthernetConnector;