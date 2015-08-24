var denodeify = require('denodeify');
var EverSocket = require('eversocket').EverSocket;
var EventEmitter = require('events').EventEmitter;

class EthernetConnector extends EventEmitter {
  constructor(ip, port) {
    super();

    this.ip = ip;
    this.port = port;

    this._socket = new EverSocket({
      reconnectWait: 100
    });

    this._socket.on('connect', () => {
      this.emit('connection');
    });

    this._socket.on('data', (data) => {
      var text = data.toString();
      var exploded = text.split('\n');
      exploded.forEach((fragment) => {
        if(fragment !== '') {
          this.emit('message', fragment);
        }
      });
    });

    this._socket.on('close', () => {
      this.emit('disconnection');
    });

    this._socket.connect(this.port, this.ip);
  }

  async send(message) {
    var P_socketWrite = denodeify(this._socket.write.bind(this._socket));
    await P_socketWrite(message);
  }
}

module.exports = EthernetConnector;