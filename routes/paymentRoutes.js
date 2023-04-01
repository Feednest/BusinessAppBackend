const express = require('express');
const paymentController = require('../controllers/paymentController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect);

router
  .route('/')
  .post(paymentController.makePayment)
  .get(paymentController.getTransactions);

router.post('/chargeIntent', paymentController.chargePayment);

// router
//   .route('/')
//   .get(paymentController.getAllBookings)
//   .post(paymentController.createBooking);

module.exports = router;
