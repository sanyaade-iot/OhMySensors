var db = global.dbForMigration;

var sql = "CREATE TABLE 'nodes' ("
  + "  'id' INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,"
  + "  'sketch_name' TEXT DEFAULT NULL,"
  + "  'sketch_version' TEXT DEFAULT NULL,"
  + "  'battery' INTEGER DEFAULT NULL"
  + ");"
  + ""
  + "CREATE TABLE 'sensors' ("
  + "  'id' INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,"
  + "  'node_id' INTEGER NOT NULL REFERENCES 'nodes' ('id'),"
  + "  'child_id' INTEGER NOT NULL,"
  + "  'type' TEXT NOT NULL,"
  + "  'description' TEXT NOT NULL"
  + ");"
  + ""
  + "CREATE TABLE 'data' ("
  + "  'id' INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,"
  + "  'sensor_id' INTEGER NOT NULL  REFERENCES 'sensors' ('id'),"
  + "  'type' TEXT NOT NULL,"
  + "  'value' TEXT DEFAULT NULL"
  + ");";

exports.up = function(next) {
  db.data.run(sql);

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
