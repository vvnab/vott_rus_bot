const moment = require('moment');
const _ = require('lodash');

const composeMessage = post => {
  let message;
  if (post.href) {
    const R = post.title.match(/\[r\]/i);
    post.title = _.escape(post.title);
    message = R
      ? `<b>${post.title}</b>\n<i>${post.topic}</i> | ${post.author}\n${post.link}`
      : `<a href='${post.href}'>${post.title}</a>\n<i>${post.topic}</i> | ${post.author}\n${post.link}`
  } else {
    // .format('DD MMMM YYYY HH:ss')
    message = `${post.title}\n${post.link}`
  }
  return message;
}

module.exports = composeMessage;