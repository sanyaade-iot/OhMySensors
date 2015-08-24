var MAX_PAYLOAD_LENGTH = 25;

var validator = require('validator');
var messageTypes = require('./type/message');
var subTypes = require('./type/sub');
var variableDetails = require('./type/variable-details');

var ProtocolError = function(message) {
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.message = message;
};
require('util').inherits(ProtocolError, Error);

var parse = function(message) {
  var exploded = message.split(';');

  if (exploded.length !== 6) {
    throw new ProtocolError('Invalid pattern');
  }

  var parsed = {
    nodeId: parseInt(exploded[0]),
    childSensorId: parseInt(exploded[1]),
    messageType: parseInt(exploded[2]),
    ack: parseInt(exploded[3]) === 1 ? true : false,
    subType: parseInt(exploded[4]),
    payload: exploded[5]
  };


  var messageTypeName = Object.keys(messageTypes).filter(function(key) { return messageTypes[key] === parsed.messageType; })[0];
  if (!messageTypeName) {
    throw new ProtocolError('Invalid message type');
  }

  parsed.messageType = messageTypeName;

  var subTypesMessage;
  if (messageTypeName === 'presentation') { subTypesMessage = subTypes.presentation; }
  else if (messageTypeName === 'set' || messageTypeName === 'req') { subTypesMessage = subTypes.setReq; }
  else if (messageTypeName === 'internal') { subTypesMessage = subTypes.internal; }
  else if (messageTypeName === 'stream') { throw new ProtocolError('Stream not handled'); }

  var subTypeName = Object.keys(subTypesMessage).filter(function(key) { return subTypesMessage[key] === parsed.subType; })[0];
  if (!subTypeName) {
    throw new ProtocolError('Invalid sub type');
  }

  parsed.subType = subTypeName;

  return parsed;
};

var stringify = function(parsed) {
  if (!messageTypes.hasOwnProperty(parsed.messageType)) {
    throw new ProtocolError('Invalid message type');
  }
  var messageType = messageTypes[parsed.messageType];


  var subTypesMessage;
  if (parsed.messageType === 'presentation') { subTypesMessage = subTypes.presentation; }
  else if (parsed.messageType === 'set' || parsed.messageType === 'req') { subTypesMessage = subTypes.setReq; }
  else if (parsed.messageType === 'internal') { subTypesMessage = subTypes.internal; }
  else if (parsed.messageType === 'stream') { throw new ProtocolError('Stream not handled'); }
  if (!subTypesMessage.hasOwnProperty(parsed.subType)) {
    throw new ProtocolError('Invalid sub type');
  }
  var subType = subTypesMessage[parsed.subType];

  if (Buffer.byteLength(parsed.payload) > MAX_PAYLOAD_LENGTH) {
    throw new ProtocolError('Payload > ' + MAX_PAYLOAD_LENGTH + ' bytes');
  }

  var message = parsed.nodeId + ';' + parsed.childSensorId + ';' + messageType + ';' + (parsed.ack ? 1 : 0) + ';' + subType + ';' + parsed.payload + '\n';

  return message;
};

var variableTypesCanReqSet = function(sensorType) {
  var allowed = [];
  var target = variableDetails.sensorTypesAllowedByVariableType;

  for (var variableType in target){
    if (target.hasOwnProperty(variableType)) {
      var filtered = target[variableType].filter(element => element === sensorType || element === '*');
      if (filtered.length > 0) {
        allowed.push(variableType);
      }
    }
  }

  return allowed;
}

var validateValue = function(variableType, value) {
  var rules = variableDetails.valueTypeByVariableType[variableType];

  switch (rules.type) {
    case 'binary':
      return validator.isIn(value, ['0', '1']);
    case 'numeric':
      return validator.isDecimal(value);
    case 'percentage':
      return validator.isInt(value, { min: 0, max: 100 });
    case 'enum':
      return validator.isIn(value, rules.oneOf);
    case 'blank':
      return true;
    case 'string':
      return true;
    case 'rgb_hex':
      return validator.isHexColor(value);
    case 'rgbw_hex':
      var color = validator.isHexColor(value.toString().substring(0, 6));
      var white = validator.isHexColor(value.toString().substring(6, 8) + '0000');
      return color && white;
    case 'id':
      return value.toString() !== '';
    case '?':
      return true;
    case '*':
      return true;
    default:
      return false;
  }
}

module.exports = {
  ProtocolError: ProtocolError,
  parse: parse,
  stringify: stringify
};