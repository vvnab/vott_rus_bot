var request = require('request-promise-native');
var fs = require('fs');
var yaml = require('js-yaml');

var doc = yaml.safeLoad(fs.readFileSync('./config.yaml', 'utf8'));
request(doc.common.getProxyUrl)
  .then(function (proxy) {
    proxy = JSON.parse(proxy);
    var proxyUrl = proxy.ip + ":" + proxy.port;
    console.log("new proxyUrl: " + proxyUrl);
    doc.common.proxy.push(proxyUrl);
    fs.writeFileSync('./config.yaml', yaml.safeDump(doc));
  })
  .catch(function (error) {
    console.error(error.message);
  });