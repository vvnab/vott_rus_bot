var fs = require('fs');
var yaml = require('js-yaml');
var _ = require("lodash");

var doc = yaml.safeLoad(fs.readFileSync('./config.yaml', 'utf8'));
doc.common.proxy = _.shuffle(doc.common.proxy);
console.log("new active proxyUrl: " + _.last(doc.common.proxy));
fs.writeFileSync('./config.yaml', yaml.safeDump(doc));
// fs.appendFileSync('proxyHisory.txt', `${new Date().toISOString()} ${_.last(doc.common.proxy)}\n`);