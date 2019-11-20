const yaml = require('js-yaml');
const fs = require('fs');
const _ = require('lodash');

require('dotenv').config();

// Get document, or throw exception on error
try {
  console.log('NODE mode:', process.env.NODE_ENV || 'develop');
  var doc = yaml.safeLoad(fs.readFileSync('./config.yaml', 'utf8'));
  global.settings = _.assignWith({}, doc.common, doc[process.env.NODE_ENV == "production" ? "production" : "develop"], (objVal, srcVal) => _.isObject(objVal) ? _.extend(objVal, srcVal) : srcVal);
  global.settings.chatId = process.env.CHAT_ID;
  global.settings.token = process.env.TOKEN;
  console.log('settings loaded:', settings);
} catch (error) {
  console.error(error);
}