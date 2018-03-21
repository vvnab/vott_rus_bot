const fs = require('fs');

const readLastPostId = () => {
  return fs.readFileSync('./.data/lastPostId');
}

const writeLastPostId = (lastPostId) => {
  return fs.writeFileSync('./.data/lastPostId', lastPostId);
}

module.exports = {
  readLastPostId,
  writeLastPostId
};