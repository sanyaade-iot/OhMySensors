var fs = require('fs');
var path = require('path');
var sqlite = require('sqlite3');
var dirty = require('dirty');
var logger = require('winston');

function checkDatabaseFile(file, description) {
  try {
    fs.accessSync(file, fs.F_OK);
  } catch (e) {
    logger.info('Creating ' + description + ' database');
    try {
      fs.openSync(file, 'w');
    } catch (e) {
      logger.error('Cannot create ' + description + ' database');
      process.exit(1);
    }
  }

  try {
    fs.accessSync(file, fs.R_OK | fs.W_OK);
  } catch (e) {
    logger.error('Don\'t have read/write access to ' + description + ' database');
    process.exit(1);
  }

}

module.exports = function bootstrap(dbDir) {
  logger.info('OhMySensors v' + require('../package').version);

  // Create directory
  try {
    fs.accessSync(dbDir, fs.F_OK);
  } catch (e) {
    logger.info('Creating database directory');
    try {
      fs.mkdirSync(dbDir);
    } catch (e) {
      logger.error('Cannot create database directory');
      process.exit(1);
    }
  }

  if (!fs.lstatSync(dbDir).isDirectory()) {
    logger.error('Database directory is a file');
    process.exit(1);
  }

  try {
    fs.accessSync(dbDir, fs.R_OK | fs.W_OK);
  } catch (e) {
    logger.error('Don\'t have read/write access to database directory');
    process.exit(1);
  }

  // Create database files

  checkDatabaseFile(path.join(dbDir, 'config.db'), 'config');
  checkDatabaseFile(path.join(dbDir, 'data.db'), 'data');

  // When arrived here, files are accessible

  db = {};
  db.config = dirty(path.join(dbDir, 'config.db'));
  db.data = new sqlite.Database(path.join(dbDir, 'data.db'));

  var loaded = 0;

  var checkLoaded = function() {
    if (loaded == Object.keys(db).length) {
      logger.info('Databases loaded');

      // Everything is bootstraped, let's start

      require('./start')(db);
    }
  }

  db.config.on('load', function() {
    loaded++;
    checkLoaded();
  });

  db.config.on('error', function() {
    logger.error('Error loading config');
    process.exit(1);
  });

  db.data.on('open', function() {
    loaded++;
    checkLoaded();
  });

  db.data.on('error', function(err) {
    logger.error('Error loading database');
    process.exit(1);
  });
}