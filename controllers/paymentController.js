const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');
const AppError = require('../utils/appError');

exports.makePayment = catchAsync(async (req, res, next) => {
  // 1) Get the currently booked tour
  // const user = await User.findOne({ email: req?.body?.email });
  // if (!user) {
  //   return next(new AppError('No such User Found', 404));
  // }

  try {
    const customer = await stripe.customers.create({
      // name: req.body.name,
      // email: req.body.email,
    });

    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customer?.id },
      { apiVersion: '2022-11-15' }
    );

    const paymentIntent = await stripe.paymentIntents.create({
      amount: 1099,
      currency: 'usd',
      customer: customer?.id,
      payment_method_types: ['card'],
    });

    res.status(200).json({
      status: 'success',
      paymentIntent: paymentIntent.client_secret,
      ephemeralKey: ephemeralKey.secret,
      customer: customer.id,
      publishableKey:
        'pk_test_51MVrt1Iy1d298f5wbH4lZXiC4Eq5MHuWOR9yZlWhBTX9TMQy3iy0nPDYlNykiIMta2VTxgFgYHcIly17jknxW0Q000yf0dLJ2x',
    });
  } catch (error) {
    console.log(error);
    return next(new AppError('Stripe Error', 404));
  }

  // 3) Create session as response
});

// exports.createBooking = factory.createOne(Booking);
// exports.getBooking = factory.getOne(Booking);
// exports.getAllBookings = factory.getAll(Booking);
// exports.updateBooking = factory.updateOne(Booking);
// exports.deleteBooking = factory.deleteOne(Booking);
