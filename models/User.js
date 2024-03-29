const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const addressSchema = new mongoose.Schema({
  address1: {
    type: String,
  },
  address2: {
    type: String,
  },
  city: {
    type: String,
  },
  country: {
    type: String,
  },
  zipCode: {
    type: String,
  },
  state: {
    type: String,
  },
  countryCode: {
    type: String,
  },
});

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Please tell us your name!'],
  },
  businessName: {
    type: String,
  },
  nickname: {
    type: String,
  },
  phoneNumber: {
    type: String,
  },
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email'],
  },
  photo: {
    type: String,
    default: 'default.jpg',
  },
  role: {
    type: String,
    enum: ['customer', 'business', 'admin'],
    default: 'customer',
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 8,
    select: false,
  },
  socialAccount: {
    type: String,
    enum: ['google', 'facebook'],
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password'],
    validate: {
      // This only works on CREATE and SAVE!!!
      validator: function (el) {
        return el === this.password;
      },
      message: 'Passwords are not the same!',
    },
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  phoneNoVerified: {
    type: Boolean,
    default: false,
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  OTP: String,
  OTPExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
  stripeID: String,
  address: {
    type: addressSchema,
  },
  yearOfBirth: {
    type: String,
  },
  sex: {
    type: String,
  },
  pin: {
    type: String,
    length: 4,
  },
});

userSchema.pre('save', async function (next) {
  // Only run this function if password was actually modified
  if (!this.isModified('password')) return next();

  // Hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);

  // Delete passwordConfirm field
  this.passwordConfirm = undefined;
  next();
});

userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.pre(/^find/, function (next) {
  // this points to the current query
  this.find({ active: { $ne: false } });
  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );

    return JWTTimestamp < changedTimestamp;
  }

  // False means NOT changed
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomInt(1000, 9999).toString();

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

userSchema.methods.createOTP = function () {
  const resetToken = crypto.randomInt(1000, 9999).toString();

  this.OTP = crypto.createHash('sha256').update(resetToken).digest('hex');

  this.OTPExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
