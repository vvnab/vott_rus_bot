require('./utils/loadSettings');
const _ = require('lodash');
const store = require('./utils/store');
const fetch = require('./utils/fetch');
const request = require('request-promise-native');
const composeMessage = require('./utils/composeMessage');
const allSettled = require("promise.allsettled");
process.env.NTBA_FIX_319 = 1;
const TelegramBot = require('node-telegram-bot-api');
const { exec } = require('child_process');

var Db = require('tingodb')().Db;
var db = new Db('.stats', {});
var stats = db.collection("stats");

let fetchErrors = 0;

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(settings.token, {
  polling: false,
  request: {
    proxy: "http://" + _.last(settings.proxy),
  }
});

bot.on('message', (msg) => bot.sendMessage(msg.chat.id, 'Ok'));

const reloadProxy = () => {
  console.log(`changing proxy...`);
  exec(`node ./shuffleProxy.js`, function (error, stdout, stderr) {
    if (error) {
      console.error(`changing proxy error: ${error.message}`);
    } else {
      console.log(`changeProxy stdout: ${stdout}`);
      console.error(`changeProxy stderr: ${stderr}`);
    }
  });
}

const newBot = {
  sendMessage(chatId, message, options) {
    return request({
      method: "GET",
      url: settings.gs,
      timeout: settings.fetchTimeout,
      // json: true,
      qs: {
        bot_token: settings.token,
        method: "sendMessage",
        args: JSON.stringify({
          chat_id: chatId,
          text: message,
          ...options
        })
      }
    })
  }
}

const checkNewPosts = () => {
  store.readLastPosts()
    .bind({})
    .then(prevPosts => {
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
      fetchErrors = 0;
      // в result[] содержатся JSON объекты как в ./.data/lastPosts.json
      const htmlPosts = results[0];
      const rssPosts = results[1];
      this.prevPosts = results[2];
      // выполняем слияние
      this.newPosts = _.unionBy(htmlPosts, rssPosts, 'id');
      this.newPosts.forEach((i, k) => {
        const rss = rssPosts.find(r => i.id === r.id);
        if (rss) {
          i.link = rss.link;
        }
      });
      // сравниваем
      this.posts = _.sortBy(_.differenceBy(this.newPosts, this.prevPosts, 'id'), 'id');
      console.log(`success loaded ${this.newPosts.length} post(s), ${this.posts.length} is new`);
      // постим
      return allSettled(this.posts.map(i => newBot.sendMessage(settings.chatId, composeMessage(i), { parse_mode: 'HTML' })))
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
      stats.insert({
        dt: new Date(),
        proxy: _.last(settings.proxy),
        result: "OK"
      }, (err, result) => {
        // nothing
      });
      if (rejectedCount >= settings.botErrorsForReloadProxy) {
        reloadProxy();
      }
    })
    .catch(error => {
      fetchErrors++;
      console.error(error);
      console.log(`fetch error number ${fetchErrors}, to remain ${settings.fetchErrorsForReloadProxy - fetchErrors}...`);
      stats.insert({
        dt: new Date(),
        proxy: _.last(settings.proxy),
        result: "ERROR"
      }, (err, result) => {
        // nothing
      });
      if (fetchErrors >= settings.fetchErrorsForReloadProxy) {
        reloadProxy();
      }
    });
}

checkNewPosts();
setInterval(checkNewPosts, 1000 * settings.checkInterval);