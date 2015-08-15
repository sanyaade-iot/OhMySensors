var serialport = require('serialport');
var SerialPort = serialport.SerialPort;
var EventEmitter = require('events').EventEmitter;

var connect = function(context) {
  context.serialPort.on('open', function onOpen() {
    context.emit('connection');

    context.serialPort.on('data', function onMessage(message) {
      context.emit('message', message);
    });
  });

  context.serialPort.on('close', function onDisconnection() {
    context.emit('disconnection');
    setTimeout(function() {
      connect(context);
    }, 100);
  });
};

var SerialConnector = function(path) {
  EventEmitter.call(this);
   
  this.serialPort = new SerialPort(path, {
    baudrate: 115200,
    parser: serialport.parsers.readline('\n')
  });

  connect(this);
};
require('util').inherits(SerialConnector, EventEmitter);

SerialConnector.prototype.send = function(message) {
  this.serialPort.write(message);
};

module.exports = SerialConnector;