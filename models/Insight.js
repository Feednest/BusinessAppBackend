const mongoose = require('mongoose');

const insightSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    required: [true, 'Please tell us your name!'],
    ref: 'User',
  },
  title: {
    type: String,
    required: [true, 'Please provide a title'],
  },
  description: {
    type: String,
  },
  images: {
    type: [String],
  },
  gender: {
    type: [String],
    // enum: ['male', 'female'],
  },
  minAge: {
    type: Number,
  },
  maxAge: {
    type: Number,
  },
  zipCode: {
    type: Number,
  },
  radius: {
    type: Number,
  },
  minParticipants: {
    type: Number,
    required: [true, 'Please provide a min number of participants'],
  },
  maxParticipants: {
    type: Number,
    required: [true, 'Please provide a max number of participants'],
  },
  expirationDate: {
    type: Date,
    required: [true, 'Please provide an expiration date'],
  },
  participantPercentage: {
    type: Number,
    required: [true, 'Please provide a participant percentage'],
  },
  discount: {
    type: Number,
    required: [true, 'Please provide a discount'],
  },
  maxPurchaseValue: {
    type: Number,
    required: [true, 'Please provide a max purchase value'],
  },
  deadline: {
    type: Date,
    required: [true, 'Please provide a deadline'],
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'pending'],
  },
  surveyQuestions: {
    type: [Object],
    // required: [true, 'Please provide survey details'],
  },
  amount: {
    type: Number,
  },
  submissions: {
    type: Number,
    default: 0,
  },
  surveyResponses: [
    {
      userID: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      },
      response: {
        type: [Object],
      },
    },
  ],
});

const Insight = mongoose.model('Insight', insightSchema);

module.exports = Insight;
