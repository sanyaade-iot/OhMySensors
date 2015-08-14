var assert = require('assert');
var SerialProtocol = SP = require('../lib/serial-protocol');

describe('Serial protocol parser', function() {
  describe('parse()', function() {
    it('should fail when bad message', function() {
      var message = '3;4;0;0;';
      assert.throws(function() {
        SP.parse(message);
      }, SP.ProtocolError);
    });
    it('should parse nodeId, childSensorId', function() {
      var message = '3;4;0;0;0;';
      var parsed = SP.parse(message);
      assert.deepEqual(parsed.nodeId, 3);
      assert.deepEqual(parsed.childSensorId, 4);
    });
    it('should parse ack', function() {
      var message = '3;4;0;0;0;';
      var parsed = SP.parse(message);
      assert.deepEqual(parsed.ack, false);
      message = '3;4;0;1;0;';
      parsed = SP.parse(message);
      assert.deepEqual(parsed.ack, true);
    });
    it('should return good message type', function() {
      var message = '3;4;0;0;0;';
      var parsed = SP.parse(message);
      assert.deepEqual(parsed.messageType, 'presentation');
    });
    it('should fail when bad message type', function() {
      var message = '3;4;999;0;0;';
      assert.throws(function() {
        SP.parse(message);
      }, SP.ProtocolError);
    });
    it('should return good sub type', function() {
      var message = '3;4;0;0;0;';
      var parsed = SP.parse(message);
      assert.deepEqual(parsed.subType, 'S_DOOR');
    });
    it('should fail when bad sub type', function() {
      var message = '3;4;0;0;999;';
      assert.throws(function() {
        SP.parse(message);
      }, SP.ProtocolError);
    });
    it('should fail when stream', function() {
      var message = '3;4;4;0;0;';
      assert.throws(function() {
        SP.parse(message);
      }, SP.ProtocolError);
    });
  });

  describe('stringify()', function() {
    it('should fail when bad parsed', function() {
      var parsed = { dumb: 'data' };
      assert.throws(function() {
        SP.stringify(parsed);
      }, SP.ProtocolError);
    });
    it('should stringify message', function() {
      var parsed = {
        nodeId: 3,
        childSensorId: 4,
        messageType: 'presentation',
        ack: false,
        subType: 'S_DOOR',
        payload: ''
      };
      var message = SP.stringify(parsed);
      assert.deepEqual(message, '3;4;0;0;0;\n');
    });
    it('should stringify ack', function() {
      var parsed = {
        nodeId: 3,
        childSensorId: 4,
        messageType: 'presentation',
        ack: false,
        subType: 'S_DOOR',
        payload: ''
      };
      var message = SP.stringify(parsed);
      assert.deepEqual(message, '3;4;0;0;0;\n');
      parsed.ack = true;
      message = SP.stringify(parsed);
      assert.deepEqual(message, '3;4;0;1;0;\n');
    });
    it('should fail when bad message type', function() {
      var parsed = {
        nodeId: 3,
        childSensorId: 4,
        messageType: 'dummy',
        ack: false,
        subType: 'S_DOOR',
        payload: ''
      };
      assert.throws(function() {
        SP.stringify(parsed);
      }, SP.ProtocolError);
    });
    it('should fail when bad sub type', function() {
      var parsed = {
        nodeId: 3,
        childSensorId: 4,
        messageType: 'presentation',
        ack: false,
        subType: 'dummy',
        payload: ''
      };
      assert.throws(function() {
        SP.stringify(parsed);
      }, SP.ProtocolError);
    });
    it('should fail when stream', function() {
      var parsed = {
        nodeId: 3,
        childSensorId: 4,
        messageType: 'stream',
        ack: false,
        subType: 'dummy',
        payload: ''
      };
      assert.throws(function() {
        SP.stringify(parsed);
      }, SP.ProtocolError);
    });
  });
});
