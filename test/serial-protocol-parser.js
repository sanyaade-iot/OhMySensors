var assert = require('assert');
var SerialProtocolParser = SPP = require('../lib/serial-protocol-parser');

describe('Serial protocol parser', function() {
  describe('parse()', function() {
    it('should fail when bad message', function() {
      var message = '3;4;0;0;';
      assert.throws(function() {
        SPP.parse(message);
      }, SPP.ProtocolError);
    });
    it('should parse nodeId, childSensorId', function() {
      var message = '3;4;0;0;0;';
      var parsed = SPP.parse(message);
      assert.deepEqual(parsed.nodeId, 3);
      assert.deepEqual(parsed.childSensorId, 4);
    });
    it('should parse ack', function() {
      var message = '3;4;0;0;0;';
      var parsed = SPP.parse(message);
      assert.deepEqual(parsed.ack, false);
      message = '3;4;0;1;0;';
      parsed = SPP.parse(message);
      assert.deepEqual(parsed.ack, true);
    });
    it('should return good message type', function() {
      var message = '3;4;0;0;0;';
      var parsed = SPP.parse(message);
      assert.deepEqual(parsed.messageType, 'presentation');
    });
    it('should fail when bad message type', function() {
      var message = '3;4;999;0;0;';
      assert.throws(function() {
        SPP.parse(message);
      }, SPP.ProtocolError);
    });
    it('should return good sub type', function() {
      var message = '3;4;0;0;0;';
      var parsed = SPP.parse(message);
      assert.deepEqual(parsed.subType, 'S_DOOR');
    });
    it('should fail when bad sub type', function() {
      var message = '3;4;0;0;999;';
      assert.throws(function() {
        SPP.parse(message);
      }, SPP.ProtocolError);
    });
    it('should fail when stream', function() {
      var message = '3;4;4;0;0;';
      assert.throws(function() {
        SPP.parse(message);
      }, SPP.ProtocolError);
    });
  });
});
