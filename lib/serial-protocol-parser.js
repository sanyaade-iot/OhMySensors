var messageTypes = require('./type/message');
var subTypes = require('./type/sub');

var ProtocolError = function(message) {
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.message = message;
};
require('util').inherits(ProtocolError, Error);

var parse = function(message) {
  var exploded = message.split(';');

  if (exploded.length != 6) {
    throw new ProtocolError('Invalid pattern');
  }

  var parsed = {
    nodeId: exploded[0],
    childSensorId: exploded[1],
    messageType: exploded[2],
    ack: exploded[3] == 1 ? true : false,
    subType: exploded[4],
    payload: exploded[5]
  };


  var messageTypeName = Object.keys(messageTypes).filter(function(key) {return messageTypes[key] == parsed.messageType})[0];
  if (!messageTypeName) {
    throw new ProtocolError('Invalid message type');
  }

  parsed.messageType = messageTypeName;

  var subTypesMessage;
  if (messageTypeName === 'presentation') { subTypesMessage = subTypes.presentation; }
  else if (messageTypeName === 'set' || messageTypeName === 'req') { subTypesMessage = subTypes.setReq; }
  else if (messageTypeName === 'inernal') { subTypesMessage = subTypes.internal; }
  else if (messageTypeName === 'stream') { throw new ProtocolError('Stream not handled'); }

  var subTypeName = Object.keys(subTypesMessage).filter(function(key) {return subTypesMessage[key] == parsed.subType})[0];
  if (!subTypeName) {
    throw new ProtocolError('Invalid sub type');
  }

  parsed.subType = subTypeName;

  return parsed;
};

module.exports = {
  ProtocolError: ProtocolError,
  parse: parse
}