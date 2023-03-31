const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');
const AppError = require('../utils/appError');

exports.makePayment = catchAsync(async (req, res, next) => {
  const { stripeID, amount } = req?.body;

  try {
    const customer = await stripe.customers.retrieve(stripeID);

    console.log(customer);

    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customer?.id },
      { apiVersion: '2022-11-15' }
    );

    // const paymentMethod = await stripe.paymentMethods.create({
    //   type: 'card',
    //   card: {
    //     number: '4242424242424242',
    //     exp_month: 7,
    //     exp_year: 2027,
    //     cvc: '314',
    //   },
    // });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount ? amount * 100 : 100,
      currency: 'usd',
      customer: customer?.id,
      // payment_method: paymentMethod?.id,
      // capture_method: 'manual',
      // confirmation_method: 'manual',
      // confirm: true,
    });

    res.status(200).json({
      status: 'success',
      id: paymentIntent.id,
      paymentIntent: paymentIntent.client_secret,
      ephemeralKey: ephemeralKey.secret,
      customer: customer.id,
    });
  } catch (error) {
    return next(new AppError('Stripe Error', 404));
  }
});

exports.chargePayment = catchAsync(async (req, res, next) => {
  try {
    // const paymentIntent = await stripe.paymentIntents.capture(
    //   req?.body?.paymentIntentId,
    //   {
    //     amount_to_capture: req?.body?.amount ? req?.body?.amount * 100 : 0,
    //   }
    // );

    // const paymentIntent = await stripe.paymentIntents.retrieve(
    //   req?.body?.paymentIntentId
    // );

    const paymentIntent = await stripe.refunds.create({
      charge: 'ch_3MquxtIy1d298f5w2iwU9NBh',
      amount: 1000,
    });

    res.status(200).json({
      status: 'success',
      paymentIntent,
    });
  } catch (error) {
    console.log(error);
    return next(new AppError('Stripe Error', 404));
  }
});
