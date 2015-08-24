var yargs = require('yargs');
var argv = yargs
  .usage('Usage: $0 <command> [options]')
  .command('start', 'Start OhMySensors')
  .command('debug', 'Debug the Serial Protocol messages sent and received', function(yargs) {
    argv = yargs
      .usage('Usage: $0 debug <command> [options]')
      .command('ethernet', 'Use Ethernet gateway')
      .command('serial', 'Use Serial gateway')
      .demand(2)
      .check(function(argv, opts){
        if(!argv._[1].match(/ethernet|serial/)) { // WA : see https://github.com/bcoe/yargs/issues/174
          throw new Error('must provide a valid command');
        }
        return true;
      })
      .argv;
  })
  .demand(1)
  .check(function(argv, opts){
    if(!argv._[0].match(/start|debug/)) { // WA : see https://github.com/bcoe/yargs/issues/174
      throw new Error('must provide a valid command');
    }
    return true;
  })
  .argv;

var command = argv._[0];

var logger = require('winston');
logger.cli();

if (command === 'start') {
  argv = yargs.reset()
    .usage('Usage: $0 start [options]')
    .example('$0 start --configFile ./config.json')
    .default('dataDir', './data')
    .default('ip', '0.0.0.0')
    .default('port', 80)
    .demand('configFile')
    .argv;

  require('../lib/bootstrap')(argv.configFile, argv.dataDir, argv.ip, argv.port);
} else if (command === 'debug') {
  var gateway;

  if (argv._[1] === 'ethernet') {
    argv = yargs.reset()
      .usage('Usage: $0 debug ethernet [options]')
      .example('$0 debug --ip 192.168.0.10')
      .default('port', 5003)
      .demand('ip')
      .argv;

    var EthernetConnector = require('../lib/connector/ethernet');
    gateway = new EthernetConnector(argv.ip, argv.port);
  } else if (argv._[1] === 'serial') {
    argv = yargs.reset()
      .usage('Usage: $0 debug [options]')
      .example('$0 debug serial --port COM3')
      .demand('port')
      .argv;

    var SerialConnector = require('../lib/connector/serial');
    gateway = new SerialConnector(argv.port);
  }

  var SerialProtocol = require('../lib/serial-protocol');

  gateway.on('connection', function onConnection() {
    logger.info('Connected to gateway');
  });

  gateway.on('disconnection', function onDisconnection() {
    logger.info('Disconnected from gateway');
  });

  gateway.on('message', function onMessage(message) {
    var parsed;
    try {
      parsed = SerialProtocol.parse(message);
    } catch(err) {
      logger.error(`Received bad formatted message: ${message}`);
    }
    logger.info(`Node #${parsed.nodeId} - Child ID #${parsed.childSensorId}: [${parsed.messageType}] ${parsed.subType} = ${parsed.payload}`);
  });
}