const request = require('request-promise');
const fs = require('fs');
const yaml = require('js-yaml');

var doc = yaml.safeLoad(fs.readFileSync('./config.yaml', 'utf8'));
request(doc.common.getProxyUrl)
  .then(function (proxy) {
    proxy = JSON.parse(proxy);
    var proxyUrl = "http://" + proxy.ip + ":" + proxy.port;
    doc.common.proxy = proxyUrl;
    fs.writeFileSync('./config.yaml', yaml.safeDump(doc));
  })
  .catch(function (error) {
    console.error(error);
  })