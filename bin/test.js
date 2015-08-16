var yargs = require('yargs');
var argv = yargs
  .command('start', 'Start OhMySensors')
  .demand(1)
  .argv;

argv = yargs.argv;
var command = argv._[0];

if (command === 'start') {
  yargs.reset()
    .default('port', 80)
    .argv;
    
  argv = yargs.argv
  console.log(argv.port);
}