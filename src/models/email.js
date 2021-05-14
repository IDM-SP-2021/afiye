import mongoose from 'mongoose';
const EmailSchema = new mongoose.Schema({
  uid: {
    type: String,
    required: true
  },
  token: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  code: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: {
      expires:43200,
    }
  }
});

const Email = mongoose.model('Email', EmailSchema);

export {Email};