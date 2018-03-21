const TelegramBot = require('node-telegram-bot-api');
const request = require('request-promise');
const dom = require('xmldom').DOMParser;
const select = require('xpath.js');
const Promise = require('bluebird');
const _ = require('lodash');
const readLastPosts = require('./utils/rwLastPosts').readLastPosts;
const writeLastPosts = require('./utils/rwLastPosts').writeLastPosts;

// replace the value below with the Telegram token you receive from @BotFather
const token = '510786249:AAGD4bI7lFc444W5HzX-TaGhlTm7s1BlU1E';

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, {
  polling: true
});

const chatId = '@vott_rus';

bot.on('message', (msg) => bot.sendMessage(msg.chat.id, 'Ok'));

const checkNewPosts = () => {
  request('http://vott.ru/rss.xml')
    .then(result => {
      try {
        const doc = new dom().parseFromString(result);
        // список постов
        const posts = select(doc, "//item/link/text()");
        // список URL постов
        const newPosts = _.map(posts, i => i.nodeValue);
        // посты с прошлой загрузки (читаем из .data/lastPosts)
        const lastPosts = readLastPosts();
        // пишем посты в .data/lastPosts
        writeLastPosts(newPosts);
        // новые посты
        const urls = _.differenceWith(newPosts, lastPosts, (a, b) => {
          a = a ? parseInt(_.last(a.split('/'))) : 0;
          b = b ? parseInt(_.last(b.split('/'))) : 0;
          return a <= b;
        }).reverse();
        // отправляем в Телеграм новые посты
        Promise.mapSeries(urls, i => bot.sendMessage(chatId, i))
          .then(messages => {
            console.log(`${messages.length} sended`);
          })
          .catch(error => {
            console.error(error)
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
setTimeout(checkNewPosts, 1000 * 60 * 1);