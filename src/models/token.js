import mongoose from 'mongoose';
const TokenSchema = new mongoose.Schema({
  uid: {
    type: String,
    required: true
  },
  token: {
    type: String,
    required: true
  }
});

const Token = mongoose.model('Token', TokenSchema);

export {Token};