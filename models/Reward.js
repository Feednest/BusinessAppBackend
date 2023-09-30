const mongoose = require('mongoose');

const rewardSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
  },
  survey: {
    type: mongoose.Schema.ObjectId,
    ref: 'Insight',
  },
  available: {
    type: Boolean,
    default: false,
  },
  claimed: {
    type: Boolean,
    default: false,
  },
  image: {
    type: String,
  },
  expireAt: {
    type: Date,
    default: Date.now,
  },
});

const Reward = mongoose.model('Reward', rewardSchema);

module.exports = Reward;
