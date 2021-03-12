const mongoose = require('mongoose');
const PostSchema = new mongoose.Schema({
  owner: {
    type: String,
    required: true
  },
  family: {
    type: String,
    required: true
  },
  pid: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true
  },
  media: {
    type: Array,
    required: true
  },
  tagged: {
    type: Array,
  },
  date: {
    type: Date,
    default: Date.now
  },
  modified: {
    type: Date,
    default: Date.now
  }
});

const Post = mongoose.model('Post', PostSchema);

module.exports = Post;