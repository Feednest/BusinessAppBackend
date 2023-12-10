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
  confirmationCode: {
    type: String,
    length: 6,
  },
  expireAt: {
    type: Date,
    default: Date.now,
  },
});

//pre find populate survey field
rewardSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'survey',
    select: '-__v',
  });
  next();
});

const Reward = mongoose.model('Reward', rewardSchema);

module.exports = Reward;
