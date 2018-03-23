const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
const _ = require('lodash');

const readLastPosts = () => {
  return fs.readFileAsync('./.data/lastPosts.json')
    .then(result => {
      return JSON.parse(result);
    });
}

const saveLastPosts = (posts) => {
  return fs.writeFileAsync('./.data/lastPosts.json', JSON.stringify(posts, null, '  '));
}

module.exports = {
  readLastPosts,
  saveLastPosts
};