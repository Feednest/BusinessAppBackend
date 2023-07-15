const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const compression = require('compression');
const cors = require('cors');
const dotenv = require('dotenv');
const cronJob = require('./utils/cronJob');

var admin = require('firebase-admin');

var serviceAccount = require('./feednestapp-firebase-adminsdk-av31l-3f342ab1ab.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
// const tourRouter = require("./routes/tourRoutes");
const userRouter = require('./routes/userRoutes');
const paymentRouter = require('./routes/paymentRoutes');
const insightRouter = require('./routes/insightRoutes');
const notificationRouter = require('./routes/notificationRoutes');
const rewardRouter = require('./routes/rewardRoutes');

// const reviewRouter = require("./routes/reviewRoutes");
// const bookingRouter = require("./routes/bookingRoutes");
// const viewRouter = require("./routes/viewRoutes");

// Start express app
const app = express();

app.enable('trust proxy');

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// 1) GLOBAL MIDDLEWARES
// Implement CORS
app.use(cors());
// Access-Control-Allow-Origin *
// api.natours.com, front-end natours.com
// app.use(cors({
//   origin: 'https://www.natours.com'
// }))

app.options('*', cors());
// app.options('/api/v1/tours/:id', cors());

// // Serving static files
app.use(express.static(path.join(__dirname, 'public')));

app.use('/img', express.static(__dirname + '/img'));

// Set security HTTP headers
app.use(helmet());

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

if (process.env.NODE_ENV === 'production') {
  app.use(morgan('dev'));
}

// Limit requests from same API
const limiter = rateLimit({
  max: 1000,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour!',
});
app.use('/api', limiter);

// Stripe webhook, BEFORE body-parser, because stripe needs the body as stream
// app.post(
//   "/webhook-checkout",
//   bodyParser.raw({ type: "application/json" }),
//   bookingController.webhookCheckout
// );

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  })
);

app.use(compression());

// Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.cookies);
  next();
});

// 3) ROUTES
//app.use("/", viewRouter);
// app.use("/api/v1/tours", tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/payment', paymentRouter);
app.use('/api/v1/insight', insightRouter);
app.use('/api/v1/notification', notificationRouter);
app.use('/api/v1/reward', rewardRouter);

// app.use("/api/v1/reviews", reviewRouter);
// app.use("/api/v1/bookings", bookingRouter);

cronJob;

app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
