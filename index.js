require('./utils/loadSettings');
const TelegramBot = require('node-telegram-bot-api');
const request = require('request-promise');
const dom = require('xmldom').DOMParser;
const select = require('xpath.js');
const Promise = require('bluebird');
const moment = require('moment');
moment.locale('ru');
const _ = require('lodash');
const readLastPosts = require('./utils/rwLastPosts').readLastPosts;
const writeLastPosts = require('./utils/rwLastPosts').writeLastPosts;


// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(settings.token, {
  polling: true
});

bot.on('message', (msg) => bot.sendMessage(msg.chat.id, 'Ok'));

const checkNewPosts = () => {
  request('http://vott.ru/rss.xml')
    .then(result => {
      try {
        const doc = new dom().parseFromString(result);
        // список постов
        const posts = select(doc, "//item");
        // список URL постов
        const newUrls = _.map(posts, i => i.getElementsByTagName('link')[0].childNodes[0].nodeValue);
        // посты с прошлой загрузки (читаем из .data/lastPosts)
        const lastUrls = readLastPosts();
        // пишем посты в .data/lastPosts 
        writeLastPosts(newUrls);
        // новые посты
        const urls = _.difference(newUrls, lastUrls).sort();
        // отправляем в Телеграм новые посты
        Promise.mapSeries(urls, (i, k) => {
          const post = _.find(posts, p => p.getElementsByTagName('link')[0].childNodes[0].nodeValue == i);
          const url = post.getElementsByTagName('link')[0].childNodes[0].nodeValue;
          const title = post.getElementsByTagName('title')[0].childNodes[0].nodeValue;
          const description = post.getElementsByTagName('description')[0].childNodes[0].nextSibling.data.toString();
          const pubDate = moment(post.getElementsByTagName('pubDate')[0].childNodes[0].nodeValue).format('DD MMMM YYYY HH:ss');
          const message = `<b>${title}</b>\n${pubDate}\n${url}`;
          return bot.sendMessage(settings.chatId, message, {
            parse_mode: 'HTML'
          });
        })
          .then(messages => {
            console.log(`${messages.length} sended`);
          })
          .catch(error => {
            console.error(error);
          });
      } catch (error) {
        console.error(error);
      }
    })
    .catch(error => {
      console.error(error);
    });
}

checkNewPosts();
setInterval(checkNewPosts, 1000 * settings.checkInterval);