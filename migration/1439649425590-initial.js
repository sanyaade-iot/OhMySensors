var db = global.dbForMigration;

var sqlNodes = `CREATE TABLE 'nodes' (
  'id' INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  'sketch_name' TEXT DEFAULT NULL,
  'sketch_version' TEXT DEFAULT NULL,
  'battery' INTEGER DEFAULT NULL
);`;

var sqlSensors = `CREATE TABLE 'sensors' (
  'id' INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  'node_id' INTEGER NOT NULL REFERENCES 'nodes' ('id'),
  'child_id' INTEGER NOT NULL,
  'type' TEXT NOT NULL,
  'description' TEXT NOT NULL
);`;

var sqlData = `CREATE TABLE 'data' (
  'id' INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  'sensor_id' INTEGER NOT NULL REFERENCES 'sensors' ('id'),
  'received_date' TEXT NOT NULL,
  'type' TEXT NOT NULL,
  'value' TEXT DEFAULT NULL
);`;

exports.up = function(next) {
  db.data.run(sqlNodes);
  db.data.run(sqlSensors);
  db.data.run(sqlData);

  db.config.set('configured', false, function() {
    next();
  });
};

exports.down = function(next) {
  db.data.run("DROP TABLE 'nodes'");
  db.data.run("DROP TABLE 'sensors'");
  db.data.run("DROP TABLE 'data'");

  db.config.rm('configured', function() {
    next();
  });
};
