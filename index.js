require('./utils/loadSettings');
const TelegramBot = require('node-telegram-bot-api');
const Promise = require('bluebird');
const _ = require('lodash');
const store = require('./utils/store');
const fetch = require('./utils/fetch');
const composeMessage = require('./utils/composeMessage');

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(settings.token, {
  polling: true
});

bot.on('message', (msg) => bot.sendMessage(msg.chat.id, 'Ok'));

const checkNewPosts = () => {
  Promise.all([fetch.rssUpdate(), fetch.htmlUpdate(), store.readLastPosts()])
    .then(results => {
      // process.abort();
      // в result[] содержатся JSON объекты как в ./.data/lastPosts.json
      const rssPosts = results[0];
      const htmlPosts = results[1];
      const prevPosts = results[2];
      // выполняем слияние
      const newPosts = _.unionBy(htmlPosts, rssPosts, 'id');
      // сравниваем
      const posts = _.differenceBy(newPosts, prevPosts, 'id').sort();
      // формируем сообщениz
      const messages = _.map(posts, composeMessage);
      // постим
      return Promise.mapSeries(messages, i => bot.sendMessage(settings.chatId, i, {
        parse_mode: 'HTML'
      }))
        .then(result => [result, newPosts]);
    })
    .then(results => {
      console.log(`success sended ${results[0].length} posts`);
      const newPosts = results[1];
      // сохраняем ...
      store.saveLastPosts(newPosts);
    })
    .catch(error => {
      console.error(error);
    });
}

const checkNewPosts2 = () => {
  store.readLastPosts()
    .then(prevPosts => {
      return fetch.rssUpdate()
        .then(result => [result, prevPosts])
        .catch(error => {
          console.error(error);
          return [[], prevPosts];
        });
    })
    .then(results => {
      return fetch.htmlUpdate()
        .then(result => [result, ...results])
        .catch(error => {
          console.error(error);
          return [[], ...results];
        })
    })
    .then(results => {
      // в result[] содержатся JSON объекты как в ./.data/lastPosts.json
      const htmlPosts = results[0];
      const rssPosts = results[1];
      const prevPosts = results[2];
      // выполняем слияние
      const newPosts = _.unionBy(htmlPosts, rssPosts, 'id');
      // сравниваем
      const posts = _.sortBy(_.differenceBy(newPosts, prevPosts, 'id'), 'id');
      // формируем сообщениz
      const messages = _.map(posts, composeMessage);
      // сохраняем ...
      store.saveLastPosts(newPosts);
      // постим
      return Promise.mapSeries(messages, i => bot.sendMessage(settings.chatId, i, {
        parse_mode: 'HTML'
      }));
    })
    .then(result => {
      console.log(`success sended ${result.length} posts`);
    })
    .catch(error => {
      console.error(error);
    });
}

checkNewPosts2();
setInterval(checkNewPosts2, 1000 * settings.checkInterval);