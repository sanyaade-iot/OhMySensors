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

      var intervals = P_dbAll(request, {
        $interval: interval_value * multiplicator,
        $from: params.from,
        $to: params.to,
        $sensorId: params.sensorId,
        $variable: params.variable
      });

      var averages = [];
      intervals.forEach(function(interval) {
        averages.push({
          from: new Date(interval.interval),
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