var fs = require('fs');
var path = require('path');
var sqlite = require('sqlite3');
var dirty = require('dirty');
var logger = require('winston');
var migrate = require('@gustavnikolaj/migrate');

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

module.exports = function bootstrap(options) {
  logger.info('OhMySensors v' + require('../package').version);

  // Load config file
  var db = {};

  try {
    db.config = require(path.join(process.cwd(), options.configFile));
  } catch (e) {
    logger.error('Cannot load config file');
    process.exit(1);
  }

  // Create directory
  try {
    fs.accessSync(options.dataDir, fs.F_OK);
  } catch (e) {
    logger.info('Creating database directory');
    try {
      fs.mkdirSync(options.dataDir);
    } catch (e) {
      logger.error('Cannot create database directory');
      process.exit(1);
    }
  }

  if (!fs.lstatSync(options.dataDir).isDirectory()) {
    logger.error('Database directory is a file');
    process.exit(1);
  }

  try {
    fs.accessSync(options.dataDir, fs.R_OK | fs.W_OK);
  } catch (e) {
    logger.error('Don\'t have read/write access to database directory');
    process.exit(1);
  }

  // Create database files

  checkDatabaseFile(path.join(options.dataDir, 'settings.db'), 'settings');
  checkDatabaseFile(path.join(options.dataDir, 'data.db'), 'data');

  // When arrived here, files are accessible

  db.settings = dirty(path.join(options.dataDir, 'settings.db'));
  db.data = new sqlite.Database(path.join(options.dataDir, 'data.db'));

  var loaded = 0;

  var checkLoaded = function() {
    if (loaded === Object.keys(db).length - 1) { // -1 because of the json config
      logger.info('Databases loaded');

      // Let's migrate TODO : DO NOT USE GLOBALS!

      global.dbForMigration = db;

      var set = migrate.load({
        load: function (cb) {
          var state = db.settings.get('databases_state');
          if (!state) {
            state = JSON.stringify({
              pos: 0
            });
          }
          return cb(null, JSON.parse(state));
        }, save: function (state, cb) {
          db.settings.set('databases_state', JSON.stringify(state), function(err) {
            return cb(err);
          });
        }
      }, path.join(__dirname, '../migration'));

      set.up(function(err) {
        if (err) {
          logger.error('Migration failed');
          process.exit(1);
        }

        logger.info('Databases up-to-date');
        
        // Delete global
        delete global.dbForMigration;

        // Everything is bootstraped, let's start
        require('./start')({
          db: db,
          ip: options.ip, 
          port: options.port
        });
      });
    }
  };

  db.settings.on('load', function() {
    loaded++;
    checkLoaded();
  });

  db.settings.on('error', function() {
    logger.error('Error loading config');
    process.exit(1);
  });

  db.data.on('open', function() {
    loaded++;
    checkLoaded();
  });

  db.data.on('error', function() {
    logger.error('Error loading database');
    process.exit(1);
  });
};