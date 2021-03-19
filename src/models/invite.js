import mongoose from 'mongoose';
const InviteSchema = new mongoose.Schema({
  uid: {
    type: String,
    required: true
  },
  token: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: {
      expires: 43200,
    }
  }
});

const Invite = mongoose.model('Invite', InviteSchema);

export {Invite};