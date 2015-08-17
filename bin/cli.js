var yargs = require('yargs');
var argv = yargs
  .usage('Usage: $0 <command> [options]')
  .command('start', 'Start OhMySensors')
  .command('debug', 'Debug the Serial Protocol messages sent and received')
  .demand(1)
  .argv;

var command = argv._[0];

var logger = require('winston');
logger.level = 'debug';
logger.cli();

if (command === 'start') {
  argv = yargs.reset()
    .usage('Usage: $0 start [options]')
    .example('$0 start --databaseDir ./ohmysensors-data')
    .default('databaseDir', './data')
    .default('ip', '0.0.0.0')
    .default('port', 80)
    .argv;

  require('../lib/bootstrap')(argv.databaseDir, argv.ip, argv.port);
} else if (command === 'debug') {
  argv = yargs.reset()
    .usage('Usage: $0 debug [options]')
    .example('$0 debug --ip 192.168.0.10 --port 5003')
    .demand(['ip', 'port'])
    .argv;

  var EthernetConnector = require('../lib/connector/ethernet');
  var SerialProtocol = require('../lib/serial-protocol');

  var gateway = new EthernetConnector(argv.ip, argv.port);
  gateway.on('connection', function onConnection() {
    logger.info('Connected to gateway');
  });

  gateway.on('reconnection', function onReconnection() {
    logger.info('Reconnected to gateway');
  });

  gateway.on('disconnection', function onDisconnection() {
    logger.info('Disconnected from gateway');
  });

  gateway.on('message', function onMessage(message) {
    var parsed;
    try {
      parsed = SerialProtocol.parse(message);
    } catch(err) {
      logger.error('Received bad formatted message: ' + message);
    }
    logger.info('Node #' + parsed.nodeId + ' - Child sensor ID #' + parsed.childSensorId + ': [' + parsed.messageType + '] ' + parsed.subType + ' = ' + parsed.payload);
  });
}