require('./utils/loadSettings');
const TelegramBot = require('node-telegram-bot-api');
const Promise = require('bluebird');
const _ = require('lodash');
const store = require('./utils/store');
const fetch = require('./utils/fetch');
const composeMessage = require('./utils/composeMessage');

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
      const prevPosts = results[2];
      this.prevPosts = prevPosts;
      // выполняем слияние
      const newPosts = _.unionBy(htmlPosts, rssPosts, 'id');
      // сравниваем
      const posts = _.sortBy(_.differenceBy(newPosts, prevPosts, 'id'), 'id');
      // формируем сообщениz
      const messages = _.map(posts, composeMessage);
      // сохраняем ...
      this.savePosts = _.sortBy(_.unionBy(newPosts, prevPosts, 'id'), 'id').reverse().slice(0, 50);
      this.savedPosts = [];
      // постим
      return Promise.mapSeries(messages, i => {
        try {
          const result = bot.sendMessage(settings.chatId, i, {
            parse_mode: 'HTML'
          });
          this.savedPosts.push(i);
          return result;
        } catch(e) {
          throw e;
        }
      });
    })
    .then(result => {
      // сохраняем ...
      store.saveLastPosts(this.savePosts);
      console.log(`success sended ${result.length} posts`);
    })
    .catch(error => {
      store.saveLastPosts(_.sortBy(_.unionBy(this.savedPosts, this.prevPosts, 'id'), 'id').reverse().slice(0, 50));
      console.error(error);
    });
}

checkNewPosts();
setInterval(checkNewPosts, 1000 * settings.checkInterval);