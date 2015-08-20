/*jslint bitwise: true */

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

module.exports = function bootstrap(dbDir, ip, port) {
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

  var db = {};
  db.config = dirty(path.join(dbDir, 'config.db'));
  db.data = new sqlite.Database(path.join(dbDir, 'data.db'));

  var loaded = 0;

  var checkLoaded = function() {
    if (loaded === Object.keys(db).length) {
      logger.info('Databases loaded');

      // Let's migrate TODO : DO NOT USE GLOBALS!

      global.dbForMigration = db;

      var set = migrate.load({
        load: function (cb) {
          var state = db.config.get('databases_state');
          if (!state) {
            state = JSON.stringify({
              pos: 0
            });
          }
          return cb(null, JSON.parse(state));
        }, save: function (state, cb) {
          db.config.set('databases_state', JSON.stringify(state), function(err) {
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
        require('./start')(db, ip, port);
      });
    }
  };

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

  db.data.on('error', function() {
    logger.error('Error loading database');
    process.exit(1);
  });
};