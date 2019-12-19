var fs = require('fs');
var yaml = require('js-yaml');
var _ = require("lodash");
var Db = require("tingodb")().Db;
var db = new Db(".stats", {});
var stats = db.collection("stats");

stats.find().toArray((err, result) => {
  if (err) {
    console.error(err, result)
  } else {
    var proxys = _.reduce(result, (s, i) => {
      var proxy = _.find(s, {proxy: i.proxy});
      var ok = i.result == "OK" ? 1 : 0;
      var error = i.result == "ERROR" ? 1 : 0;
      if (proxy) {
        proxy.ok += ok;
        proxy.error += error;
        if (ok && new Date(i.dt) > new Date(proxy.lastOk)) {
          proxy.lastOk = i.dt;
        } 
        if (error && new Date(i.dt) > new Date(proxy.lastError)) {
          proxy.lastError = i.dt;
        } 
      } else {
        s.push({
          proxy: i.proxy,
          ok: ok,
          error: error,
          lastOk: ok ? i.dt : null,
          lastError: error ? i.dt : null
        })
      }
      return s;
    }, []);

    var badProxys = _.map(_.filter(proxys, (i) => {
      return i.ok == 0 && i.error > 3;
    }), "proxy");
    console.log("badProxys", badProxys);
    if (badProxys && badProxys.length == 0) {
      return;
    }
    var doc = yaml.safeLoad(fs.readFileSync('./config.yaml', 'utf8'));
    doc.common.proxy = _.xor(badProxys, doc.common.proxy);
    fs.writeFileSync('./config.yaml', yaml.safeDump(doc));
    stats.remove((err, result) => {
      if (err) {
        console.error(err, result);
      }
    });
  }
});
