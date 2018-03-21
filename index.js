const TelegramBot = require('node-telegram-bot-api');
const request = require('request-promise');
const dom = require('xmldom').DOMParser;
const select = require('xpath.js');
const Promise = require('bluebird');
const _ = require('lodash');
const readLastPostId = require('./utils/rwLastPostId').readLastPostId;
const writeLastPostId = require('./utils/rwLastPostId').writeLastPostId;

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
        const urls = _.map(posts, i => i.nodeValue);
        // ID последнего поста с прошлой загрузки (читаем из .data/lastPostId)
        const lastPostId = parseInt(readLastPostId());
        // ID последнего поста
        const newLastPostId = parseInt(_.last(_.first(urls).split('/')));
        // пишем ID последнего поста в .data/lastPostId
        writeLastPostId(newLastPostId);
        // новые посты
        const newUrls = _.filter(urls, i => lastPostId < parseInt(_.last(i.split('/')))).reverse();
        // отправляем в Телеграм новые посты
        Promise.mapSeries(newUrls, i => bot.sendMessage(chatId, i))
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