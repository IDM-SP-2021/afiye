const mongoose = require('mongoose');
const AlbumSchema = new mongoose.Schema({
  owner: {
    type: String,
    required: true,
  },
  family: {
    type: String,
    required: true,
  },
  alid: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  cover: {
    type: String,
    required: true,
  },
  posts: {
    type: Array,
    required: true,
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

const Album = mongoose.model('Album', AlbumSchema);

module.exports = Album;