var denodeify = require('denodeify');

module.exports = async function(optionsInternal, options) {
  var db = optionsInternal.db;
  var ws = optionsInternal.ws;

  var id = options.id;
  var type = options.type;
  var params = options.params;

  var P_dbGet = denodeify(db.data.get.bind(db.data));
  var P_dbRun = denodeify(db.data.run.bind(db.data));
  var P_dbAll = denodeify(db.data.all.bind(db.data));

  var toSend;

  switch (type) {
    case 'getAverages':
      var interval_value = params.interval[0];
      var interval_type = params.interval[1];
      var interval_multiplicator = {
        'second': 1,
        'minute': 60,
        'hour': 3600,
        'day': 86400
      };
      var multiplicator = interval_multiplicator[interval_type];
      var date_filter;
      if (params.to) {
        date_filter = 'BETWEEN $from AND $to';
      } else {
        date_filter = '> $from';
      }

      var request = `SELECT datetime((strftime('%s', received_date) / $interval) * $interval, 'unixepoch') AS interval,
        avg(value) AS average, min(value) AS min, max(value) AS max
        FROM data
        WHERE received_date ${date_filter}
        AND sensor_id = $sensorId AND type = $variable 
        GROUP BY interval
        ORDER BY interval`;

      var intervals = await P_dbAll(request, {
        $interval: interval_value * multiplicator,
        $from: params.from,
        $to: params.to,
        $sensorId: params.sensorId,
        $variable: params.variable
      });

      var averages = [];
      intervals.forEach(function(interval) {
        averages.push({
          date: new Date(interval.interval),
          average: interval.average,
          min: interval.min,
          max: interval.max
        });
      });

      toSend = {
        averages: averages
      };
      break;
    case 'getLastChanges':
      var request = `SELECT a.received_date, a.value
        FROM (SELECT _rowid_, received_date, sensor_id, type, value FROM data) a
        JOIN (SELECT _rowid_, received_date, sensor_id, type, value FROM data) b
        ON a._rowid_ = b._rowid_+1 
        WHERE a.type = b.type
        AND a.value != b.value
        AND a.sensor_id = $sensorId
        AND a.type = $variable
        ORDER BY a.received_date DESC
        LIMIT $count`;

      var lastChanges = await P_dbAll(request, {
        $sensorId: params.sensorId,
        $variable: params.variable,
        $count: params.count
      });

      var changes = [];
      lastChanges.forEach(function(change) {
        changes.push({
          date: new Date(change.received_date),
          value: interval.value,
        });
      });

      toSend = {
        changes: changes
      };
      break;
    default:
      break;
  }

  if (toSend) {
    await ws.send(JSON.stringify(['response', {
      id: id,
      response: toSend  
    }]));
  }
}