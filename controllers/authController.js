const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Email = require('../utils/email');
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, req, res, msg) => {
  msg ? msg : (msg = '');

  const token = signToken(user?._id);

  res.cookie('jwt', token, {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
  });

  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success' + msg,
    token,
    data: {
      user,
    },
  });
};

//method to login/singup user using google their google account
exports.socialLogin = catchAsync(async (req, res, next) => {
  const { email, role, socialAccount } = req.body;

  const user = await User.findOne({ email });

  // if client is already registered with the google account we will directly log them in and send an access token to the client
  if (user != null) {
    if (user?.emailVerified == false && user.phoneNoVerified == false) {
      return next(new AppError('Please Verify Your Email Or Phone', 401));
    } else if (user?.role != role) {
      return next(new AppError('You cannot login with this role', 401));
    } else return createSendToken(user, 200, req, res);
  }

  const customer = await stripe.customers.create({
    name: req?.body?.name,
    email: req?.body?.email,
  });

  // if client is not registered with the google account we will register them
  const newUser = new User({
    email,
    role,
    socialAccount,
    stripeID: customer?.id,
  });

  await newUser.save({ validateBeforeSave: false });

  const url = `${req.protocol}://${req.get('host')}/me`;

  await new Email(newUser, url, '').sendWelcome();

  createSendToken(newUser, 200, req, res, ' in Registering as New User');
});

exports.signup = catchAsync(async (req, res, next) => {
  const { name, email, password, passwordConfirm, role } = req.body;

  // 1) Check if email and password exist
  if (!name || !email || !password || !passwordConfirm) {
    return next(new AppError('Please provide All required Fields!', 400));
  }

  //Check if User already exists
  const user = await User.findOne({ email: req?.body?.email });

  if (user) {
    if (user?.role !== role) {
      return next(new AppError('This email is already taken', 501));
    }
    if (user?.emailVerified == false && user.phoneNoVerified == false) {
      return next(new AppError('Please Verify Your Email Or Phone', 401));
    } else return next(new AppError('User Already Exists', 501));
  }
  const customer = await stripe.customers.create({
    name: req?.body?.name,
    email: req?.body?.email,
  });

  const newUser = new User({
    username: name,
    email: email,
    password: password,
    passwordConfirm: passwordConfirm,
    role: role ? role : 'business',
    stripeID: customer?.id,
  });

  await newUser.save({ validateBeforeSave: false });

  const url = `${req.protocol}://${req.get('host')}/me`;

  await new Email(newUser, url, '').sendWelcome();

  createSendToken(newUser, 201, req, res);
});

exports.customerSignup = catchAsync(async (req, res, next) => {
  const {
    email,
    nickname,
    phoneNumber,
    address,
    yearOfBirth,
    sex,
    password,
    passwordConfirm,
    role,
  } = req.body;

  // 1) Check if email and password exist
  if (!nickname || !email || !password || !passwordConfirm) {
    return next(new AppError('Please provide All required Fields!', 400));
  }

  //Check if User already exists
  const user = await User.findOne({ email: req?.body?.email });

  if (user) {
    if (user?.role !== role) {
      return next(new AppError('This email is already taken', 501));
    }
    if (user?.emailVerified == false && user.phoneNoVerified == false) {
      return next(new AppError('Please Verify Your Email Or Phone', 401));
    } else return next(new AppError('User Already Exists', 501));
  }
  // const customer = await stripe.customers.create({
  //   name: req?.body?.name,
  //   email: req?.body?.email,
  // });

  const newUser = new User({
    email: email,
    password: password,
    passwordConfirm: passwordConfirm,
    nickname: nickname,
    phoneNumber: phoneNumber,
    address: address,
    yearOfBirth: yearOfBirth,
    sex: sex,
    role: role ? role : 'customer',
  });

  await newUser.save({ validateBeforeSave: false });

  const url = `${req.protocol}://${req.get('host')}/me`;

  await new Email(newUser, url, '').sendWelcome();

  createSendToken(newUser, 201, req, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password, role } = req.body;

  // 1) Check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password!', 400));
  }

  // 2) Check if user exists && password is correct
  const user = await User.findOne({ email }).select('+password');

  if (user == null) {
    return next(new AppError('Invalid Username or Password', 400));
  }

  console.log(user.socialAccount, 'social account');

  if (user.socialAccount) {
    return next(
      new AppError(
        `It seems you signed up with ${user.socialAccount}. Please continue using 'Sign in with ${user.socialAccount}' for login`,
        400
      )
    );
  }

  if (user?.password == undefined) {
    return createSendToken(user, 200, req, res);
  }

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Invalid email or password', 401));
  }

  if (user?.emailVerified == false && user.phoneNoVerified == false) {
    return next(new AppError('Please Verify Your Email Or Phone', 401));
  }

  if (user?.role != role) {
    return next(new AppError('You cannot login with this role', 401));
  }

  // 3) If everything ok, send token to client
  createSendToken(user, 200, req, res);
});

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: 'success' });
};

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check of it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError('You are not logged in! Please log in to get access.', 401)
    );
  }

  // 2) Verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError(
        'The user belonging to this token does no longer exist.',
        401
      )
    );
  }

  // 4) Check if user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password! Please log in again.', 401)
    );
  }

  // GRANT ACCESS TO PROTECTED ROUTE
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

// Only for rendered pages, no errors!
exports.isLoggedIn = catchAsync(async (req, res, next) => {
  if (req?.body?.token) {
    try {
      // 1) verify token
      const decoded = await promisify(jwt.verify)(
        req?.body?.token,
        process.env.JWT_SECRET
      );

      // 2) Check if user still exists
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next(new AppError('User Does Not Exist', 200));
      }

      // 3) Check if user changed password after the token was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next(
          new AppError(
            'User Recently Changed Password! Please Log In Again.',
            200
          )
        );
      }

      // THERE IS A LOGGED IN USER
      res.locals.user = currentUser;

      res.status(200).json({
        status: 'success',
        data: {
          user: currentUser,
        },
      });
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return next(new AppError('Token Expired', 200));
      } else {
        return next(new AppError('Invalid Token', 200));
      }
    }
  }
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles ['admin', 'lead-guide']. role='user'
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }

    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with email address.', 404));
  }

  if (user.socialAccount) {
    return next(
      new AppError(
        `It seems you signed up with ${user.socialAccount} so you cannot reset password`,
        400
      )
    );
  }

  // 2) Generate the random reset token
  const resetToken = user.createPasswordResetToken();

  await user.save({ validateBeforeSave: false });

  // 3) Send it to user's email
  try {
    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/resetPassword/${resetToken}`;

    await new Email(user, resetURL, resetToken).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError('There was an error sending the email. Try again later!'),
      500
    );
  }
});

exports.renderResetPassword = catchAsync(async (req, res, next) => {
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  // 2) If token has not expired, and there is user, set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  res
    .set(
      'Content-Security-Policy',
      "default-src *; style-src 'self' http://* 'unsafe-inline'; script-src 'self' http://* 'unsafe-inline' 'unsafe-eval'"
    )
    .render('email/reset.pug');
});

exports.renderPug = catchAsync(async (req, res, next) => {
  // res.status(200).render('email/reset.pug', { token: req.params.token });

  res.render('email/verifyOTP', {
    token: req.params.token,
    firstName: 'Mohammad Haris',
  });
});

exports.verifyOTP = catchAsync(async (req, res, next) => {
  console.log('req, body', req?.body);
  const user = await User.findOne({ email: req?.body?.email });
  if (!user) {
    return next(new AppError('Invalid Username or Password', 404));
  }

  if (!req?.body?.type)
    return next(
      new AppError(
        'Please Define Type for Verification as Either Phone or Email',
        404
      )
    );

  // 2) Generate the random reset token
  const token = user.createOTP();

  await user.save({ validateBeforeSave: false });

  // 3) Send it to user's email
  try {
    if (req?.body?.type === 'email') {
      await new Email(user, ' ', token).sendVerifyOTP();
    } else {
      console.log('phone numbmer', req?.body?.phone);
      const phone = await client.messages
        .create({
          body: `Hi from Haris as a Test Server!Your OTP token is ${token}`,
          // from: '+16283333372',
          from: '+16463928580',
          to: '+923322332243',
          // to: `+92${req?.body?.phone}`,
        })
        .then((message) => console.log('message::', message));
      console.log('phone', phone);
      console.log(token);
    }
    console.log(token);

    res.status(200).json({
      status: 'success',
      message: `Token sent to ${req?.body?.type}`,
    });
  } catch (err) {
    user.OTP = undefined;
    user.OTPExpires = undefined;
    await user.save({ validateBeforeSave: false });

    console.log('errororor:::', err);

    return next(
      new AppError('There was an error sending the token. Try again later!'),
      500
    );
  }
});

exports.checkVerifyOTP = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token

  const hashedToken = crypto
    .createHash('sha256')
    .update(req.body.token)
    .digest('hex');

  const user = await User.findOne({
    OTP: hashedToken,
    OTPExpires: { $gt: Date.now() },
  });

  //If no user found then return error
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }

  user.emailVerified = true;
  user.OTP = undefined;
  user.OTPExpires = undefined;

  await user.save({ validateBeforeSave: false });

  // 3) Update changedPasswordAt property for the user
  // 4) Log the user in, send JWT
  createSendToken(user, 200, req, res);
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token

  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  //If no user found then return error
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save({ validateBeforeSave: false });

  // 3) Update changedPasswordAt property for the user
  // 4) Log the user in, send JWT
  createSendToken(user, 200, req, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get user from collection
  const user = await User.findById(req.user.id).select('+password');

  // 2) Check if POSTed current password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is wrong.', 401));
  }

  // 3) If so, update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  // User.findByIdAndUpdate will NOT work as intended!

  // 4) Log user in, send JWT
  createSendToken(user, 200, req, res);
});
