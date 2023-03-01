const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');
const AppError = require('../utils/appError');

exports.makePayment = catchAsync(async (req, res, next) => {
  // 1) Get the currently booked tour
  const user = await User.findOne({ email: req?.body?.email });
  if (!user) {
    return next(new AppError('No such User Found', 404));
  }

  console.log(user);

  try {
    const customer = await stripe.customers.create({
      name: req.body.name,
      email: req.body.email,
    });

    console.log(customer);

    // const payment = await stripe.charges.create({
    //   amount: req.body.amount * 100,
    //   currency: 'usd',
    //   customer: customer.id,
    // });

    res.status(200).json({
      status: 'success',
      customer,
    });
  } catch (error) {
    console.log(error);
    return next(new AppError('Stripe Error', 404));
  }

  // 3) Create session as response
});

// const createBookingCheckout = async (session) => {
//   const tour = session.client_reference_id;
//   const user = (await User.findOne({ email: session.customer_email })).id;
//   const price = session.display_items[0].amount / 100;
//   await Booking.create({ tour, user, price });
// };

// exports.webhookCheckout = (req, res, next) => {
//   const signature = req.headers['stripe-signature'];

//   let event;
//   try {
//     event = stripe.webhooks.constructEvent(
//       req.body,
//       signature,
//       process.env.STRIPE_WEBHOOK_SECRET
//     );
//   } catch (err) {
//     return res.status(400).send(`Webhook error: ${err.message}`);
//   }

//   if (event.type === 'checkout.session.completed')
//     createBookingCheckout(event.data.object);

//   res.status(200).json({ received: true });
// };

// exports.createBooking = factory.createOne(Booking);
// exports.getBooking = factory.getOne(Booking);
// exports.getAllBookings = factory.getAll(Booking);
// exports.updateBooking = factory.updateOne(Booking);
// exports.deleteBooking = factory.deleteOne(Booking);
