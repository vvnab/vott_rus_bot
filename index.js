require('./utils/loadSettings');
const TelegramBot = require('node-telegram-bot-api');
const Promise = require('bluebird');
const _ = require('lodash');
const store = require('./utils/store');
const fetch = require('./utils/fetch');
const composeMessage = require('./utils/composeMessage');
const allSettled = require("promise.allsettled");

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(settings.token, {
  polling: true,
  request: {
    proxy: settings.proxy
  }
});

bot.on('message', (msg) => bot.sendMessage(msg.chat.id, 'Ok'));

const checkNewPosts = () => {
  store.readLastPosts()
    .bind({})
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
      this.prevPosts = results[2];
      // выполняем слияние
      this.newPosts = _.unionBy(htmlPosts, rssPosts, 'id');
      // сравниваем
      this.posts = _.sortBy(_.differenceBy(this.newPosts, this.prevPosts, 'id'), 'id');
      // постим
      return allSettled(this.posts.map(i => bot.sendMessage(settings.chatId, composeMessage(i), { parse_mode: 'HTML' })))
    })
    .then(result => {
      result.forEach((i, k) => {
        if (i.status === 'rejected') {
          this.posts.splice(k, 1, null);
        }
      });
      // что подлежит сохранению
      const savePosts = _.sortBy(_.unionBy(_.compact(this.posts), this.prevPosts, 'id'), 'id').reverse().slice(0, 50);
      // сохраняем ...
      store.saveLastPosts(savePosts);
      console.log(`success sended and saved ${this.posts.length}, rejected ${result.length - this.posts.length}`);
    })
    .catch(error => {
      console.error(error);
    });
}

checkNewPosts();
setInterval(checkNewPosts, 1000 * settings.checkInterval);