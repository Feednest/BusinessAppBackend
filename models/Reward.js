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
});

const Reward = mongoose.model('Reward', rewardSchema);

module.exports = Reward;
