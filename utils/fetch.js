const request = require('request-promise');
const dom = require('xmldom').DOMParser;
const select = require('xpath.js');
const _ = require('lodash');
const cheerio = require('cheerio');
const moment = require('moment');
moment.locale('ru');

const rssUpdate = () => {
  return request({
    proxy: settings.proxy,
    url: settings.rssUrl
  }).then(result => {
    try {
      const doc = new dom().parseFromString(result);
      // список постов
      const posts = select(doc, "//item");
      return _.map(posts, i => {
        const link = i.getElementsByTagName('link')[0].childNodes[0].nodeValue;
        const id = parseInt(_.last(link.split('/')));
        return {
          id,
          link,
          title: i.getElementsByTagName('title')[0].childNodes[0].nodeValue,
          // description: i.getElementsByTagName('description')[0].childNodes[0].nextSibling.data.toString(),
          pubDate: moment(i.getElementsByTagName('pubDate')[0].childNodes[0].nodeValue).toJSON()
        }
      })
    } catch (error) {
      console.error(error);
    }
  })
    .catch(error => {
      console.error(error);
    });

}

const htmlUpdate = () => {
  return request({
    proxy: settings.proxy,
    url: settings.htmlUrl
  }).then(result => {
    const $ = cheerio.load(result);
    const rawPosts = $('div[id^=entry] div[class=entry]');
    return _.map(rawPosts, i => {
      const link = settings.htmlUrl + $('span[class=comments_link] a', i).attr('href');
      const id = parseInt(_.last(link.split('/')));
      return {
        id,
        link,
        href: $('a[class=title]', i).attr('href'),
        title: $('a[class=title]', i).text(),
        topic: $('span', i).eq(1).text(),
        author: $('span', i).eq(2).text()
      }
    })
  })
    .catch(error => {
      console.error(error);
    });
}

module.exports = {
  rssUpdate,
  htmlUpdate
};