import mongoose from 'mongoose';
const TokenSchema = new mongoose.Schema({
  uid: {
    type: String,
    required: true
  },
  token: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: {
      expires: 43200,
    }
  }
});

const Token = mongoose.model('Token', TokenSchema);

export {Token};