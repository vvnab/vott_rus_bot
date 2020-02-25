const yaml = require('js-yaml');
const fs = require('fs');
const _ = require('lodash');

if (process.env.NODE_ENV === 'production') {
  require('dotenv').config();
} else {
  var path = require("path");
  var fileName = '.env.' + (process.env.NODE_ENV || 'develop');
  require('dotenv').config({ path: path.resolve(process.cwd(), fileName) });
}


// Get document, or throw exception on error
try {
  console.log('NODE mode:', process.env.NODE_ENV || 'develop');
  var doc = yaml.safeLoad(fs.readFileSync('./config.yaml', 'utf8'));
  global.settings = _.assignWith({}, doc.common, doc[process.env.NODE_ENV == "production" ? "production" : "develop"], (objVal, srcVal) => _.isObject(objVal) ? _.extend(objVal, srcVal) : srcVal);
  global.settings.chatId = process.env.CHAT_ID;
  global.settings.token = process.env.TOKEN;
  global.settings.gs = process.env.GS;
  global.settings.htmlUrl = process.env.HTML_URL;
  global.settings.rssUrl = process.env.RSS_URL;
  console.log('settings loaded:', settings);
} catch (error) {
  console.error(error);
}