const fs = require('fs');
const _ = require('lodash');

const readLastPosts = () => {
  const urls = fs.readFileSync('./.data/lastPosts');
  return String(urls).split('\n');
}

const writeLastPosts = (lastPostIds) => {
  return fs.writeFileSync('./.data/lastPosts', lastPostIds.join('\n'));
}

module.exports = {
  readLastPosts,
  writeLastPosts
};