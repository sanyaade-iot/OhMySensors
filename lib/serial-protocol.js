var MAX_PAYLOAD_LENGTH = 25;

var validator = require('validator');
var messageTypes = require('./type/message');
var subTypes = require('./type/sub');
var variableDetails = require('./type/variable-details');

class ProtocolError extends Error {
  constructor(message) {
    super();
    this.message = message; 
    this.stack = (new Error()).stack;
    this.name = this.constructor.name;
  }
}

var parse = function(raw) {
  var exploded = raw.split(';');

  if (exploded.length !== 6) {
    throw new ProtocolError('Invalid pattern');
  }

  var message = new Message({
    nodeId: parseInt(exploded[0]),
    childSensorId: parseInt(exploded[1]),
    messageType: parseInt(exploded[2]),
    ack: parseInt(exploded[3]) === 1 ? true : false,
    subType: parseInt(exploded[4]),
    payload: exploded[5]
  });


  var messageTypeName = Object.keys(messageTypes).filter(function(key) { return messageTypes[key] === message.messageType; })[0];
  if (!messageTypeName) {
    throw new ProtocolError('Invalid message type');
  }

  message.messageType = messageTypeName;

  var subTypesMessage;
  if (messageTypeName === 'presentation') { subTypesMessage = subTypes.presentation; }
  else if (messageTypeName === 'set' || messageTypeName === 'req') { subTypesMessage = subTypes.setReq; }
  else if (messageTypeName === 'internal') { subTypesMessage = subTypes.internal; }
  else if (messageTypeName === 'stream') { throw new ProtocolError('Stream not handled'); }

  var subTypeName = Object.keys(subTypesMessage).filter(function(key) { return subTypesMessage[key] === message.subType; })[0];
  if (!subTypeName) {
    throw new ProtocolError('Invalid sub type');
  }

  message.subType = subTypeName;

  if (!message.validate(null, false)) {
    throw new ProtocolError('There is a protocol error');
  }

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

var validateVariableValue = function(variableType, value) {
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

class Message {
  constructor(options) {
    this.nodeId = options.nodeId;
    this.childSensorId = options.childSensorId;
    this.messageType = options.messageType;
    this.ack = options.ack;
    this.subType = options.subType;
    this.payload = options.payload;
  }

  stringify() {
    if (!this.validate()) {
      throw new ProtocolError('There is a protocol error');
    }

    var messageType = messageTypes[this.messageType];

    var subTypesMessage;
    if (this.messageType === 'presentation') { subTypesMessage = subTypes.presentation; }
    else if (this.messageType === 'set' || this.messageType === 'req') { subTypesMessage = subTypes.setReq; }
    else if (this.messageType === 'internal') { subTypesMessage = subTypes.internal; }

    var subType = subTypesMessage[this.subType];

    var message = this.nodeId + ';' + this.childSensorId + ';' + messageType + ';' + (this.ack ? 1 : 0) + ';' + subType + ';' + this.payload + '\n';

    return message;
  }

  validate(sensorType = null, outMessage = true) {
    if (!messageTypes.hasOwnProperty(this.messageType)) {
      //throw new ProtocolError('Invalid message type');
      return false;
    }

    var subTypesMessage;
    if (this.messageType === 'presentation') { subTypesMessage = subTypes.presentation; }
    else if (this.messageType === 'set' || this.messageType === 'req') { subTypesMessage = subTypes.setReq; }
    else if (this.messageType === 'internal') { subTypesMessage = subTypes.internal; }
    if (this.messageType === 'stream') { return false; }//throw new ProtocolError('Stream not handled'); }

    if (!subTypesMessage.hasOwnProperty(this.subType)) {
      //throw new ProtocolError('Invalid sub type');
      return false;
    }

    if (Buffer.byteLength(this.payload) > MAX_PAYLOAD_LENGTH) {
      //throw new ProtocolError('Payload > ' + MAX_PAYLOAD_LENGTH + ' bytes');
      return false;
    }

    if (this.messageType !== 'req' && this.messageType !== 'set') {
      return true;
    }

    if (!validateVariableValue(this.subType, this.payload)) {
      //throw new ProtocolError(`Value ${this.payload} not allowed variable type ${this.subType}`);
      return false;
    }

    if (outMessage) {
      var actuator = variableDetails.valueTypeByVariableType[variableType].actuator;

      if (!actuator) {
        return false;
      }
    }

    if (sensorType) {
      var allowed = variableTypesCanReqSet(sensorType);
      if (!validator.isIn(this.subType, allowed)) {
        //throw new ProtocolError(`Variable type ${this.subType} not allowed for sensor type ${sensorType}`);
        return false;
      }
    }

    return true;
  }
}

module.exports = {
  ProtocolError: ProtocolError,
  parse: parse,
  variableTypesCanReqSet: variableTypesCanReqSet,
  validateVariableValue: validateVariableValue,
  Message: Message
};