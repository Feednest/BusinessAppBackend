const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');
const AppError = require('../utils/appError');
const Insight = require('../models/Insight');
const User = require('../models/User');
const multer = require('multer');
const sharp = require('sharp');

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images.', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadInsightPhotos = upload.array('images', 6);

exports.resizeInsightPhotos = catchAsync(async (req, res, next) => {
  console.log(req.files);

  if (!req.files) return next();

  req.body.images = [];

  console.log(req.user);

  await Promise.all(
    req.files.map(async (file, i) => {
      const filename = `insight-${req?.user?._id}-${Date.now()}-${i + 1}.jpeg`;

      await sharp(file.buffer)
        .resize(500, 500)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/insights/${filename}`);

      req.body.images.push(filename);
    })
  );

  next();
});

exports.createInsight = catchAsync(async (req, res, next) => {
  const {
    user,
    title,
    minParticipants,
    maxParticipants,
    expirationDate,
    participantPercentage,
    discount,
    maxPurchaseValue,
    deadline,
    surveyQuestions,
  } = req.body;

  // 1) Get the user
  const newUser = await User.findById({ _id: req?.body?.user });

  if (!newUser) {
    return next(new AppError('No such User Found', 404));
  }

  if (
    !user ||
    !title ||
    !minParticipants ||
    !maxParticipants ||
    !expirationDate ||
    !participantPercentage ||
    !discount ||
    !maxPurchaseValue ||
    !deadline ||
    !surveyQuestions
  ) {
    return next(new AppError('Please fill all the fields', 404));
  }

  //Comment this for postman Testing

  [req.body.surveyQuestions, req.body.expirationDate, req.body.deadline] = [
    JSON.parse(req.body.surveyQuestions),
    JSON.parse(req.body.expirationDate),
    JSON.parse(req.body.deadline),
  ];

  try {
    const insight = await Insight.create(req.body);

    res.status(200).json({
      status: 'success',
      data: {
        data: insight,
      },
    });
  } catch (error) {
    return next(new AppError(error, 500));
  }
});

exports.getAllInsights = factory.getAll(Insight);

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
