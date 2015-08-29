var denodeify = require('denodeify');
var serialport = require('serialport');
var SerialPort = serialport.SerialPort;
var EventEmitter = require('events').EventEmitter;

class SerialConnector extends EventEmitter {
  constructor(path) {
    super();

    this._path = path;

    this._serialPort = new SerialPort(this._path, {
      baudrate: 115200,
      parser: serialport.parsers.readline('\n')
    });

    this._connect();
  }

  _connect() {
    this._serialPort.on('open', () => {
      this.emit('connection');

      this._serialPort.on('data', (message) => {
        this.emit('message', message);
      });
    });

    this._serialPort.on('close', () => {
      this.emit('disconnection');

      setTimeout(() => {
        this._connect();
      }, 100);
    });
    
    this._serialPort.on('error', (err) => {
      this.emit('error');
    });

  }

  async send(message) {
    var P_serialDrain = denodeify(this._serialPort.drain.bind(this._serialPort));
    this._serialPort.write(message);
    await P_serialDrain();
  }
}

module.exports = SerialConnector;