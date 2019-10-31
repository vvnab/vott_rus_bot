require('./utils/loadSettings');
const _ = require('lodash');
const store = require('./utils/store');
const fetch = require('./utils/fetch');
const composeMessage = require('./utils/composeMessage');
const allSettled = require("promise.allsettled");
process.env.NTBA_FIX_319 = 1;
const TelegramBot = require('node-telegram-bot-api');
const { exec } = require('child_process');

let errorCount = 0;

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(settings.token, {
  polling: false,
  request: {
    proxy: settings.proxy
  }
});

bot.on('message', (msg) => bot.sendMessage(msg.chat.id, 'Ok'));

const reloadProxy = () => {
  console.log(`changing proxy...`);
  exec(`node ./changeProxy.js`, function(error, stdout, stderr) {
    if (error) {
      console.error(`changing proxy error: ${error.message}`);
    } else {
      console.log(`changeProxy stdout: ${stdout}`);
      console.error(`changeProxy stderr: ${stderr}`);            
    }
  });
}

const checkNewPosts = () => {
  store.readLastPosts()
    .bind({})
    .then(prevPosts => {
      // return [];
      return fetch.rssUpdate()
        .then(result => [result, prevPosts]);
        // .catch(error => {
        //   console.error(error);
        //   return [[], prevPosts];
        // });
    })
    .then(results => {
      return fetch.htmlUpdate()
        .then(result => [result, ...results]);
        // .catch(error => {
        //   console.error(error);
        //   return [[], ...results];
        // })
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
      console.log(`success loaded ${this.newPosts.length} post(s), ${this.posts.length} is new`);
      // постим
      return allSettled(this.posts.map(i => bot.sendMessage(settings.chatId, composeMessage(i), { parse_mode: 'HTML' })))
    })
    .then(result => {
      result.forEach((i, k) => {
        if (i.status === 'rejected') {
          this.posts.splice(k, 1, null);
        }
      });
      const sendedPost = _.compact(this.posts);
      // что подлежит сохранению
      const savePosts = _.sortBy(_.unionBy(sendedPost, this.prevPosts, 'id'), 'id').reverse().slice(0, 50);
      // сохраняем ...
      store.saveLastPosts(savePosts);
      var rejectedCount = result.length - sendedPost.length;
      console.log(`success sended and saved ${sendedPost.length}, rejected ${rejectedCount}`);
      if (rejectedCount >= settings.botErrorsForReloadProxy) {
        reloadProxy();
      }
    })
    .catch(error => {
      console.error(error);
      console.log(`fetch error number ${++errorCount}, to remain ${settings.fetchErrorsForReloadProxy - errorCount}...`);
      if (errorCount >= settings.fetchErrorsForReloadProxy) {
        errorCount = 0;
        reloadProxy();
      }
    });
}

checkNewPosts();
setInterval(checkNewPosts, 1000 * settings.checkInterval);