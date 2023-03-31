const express = require('express');
const paymentController = require('../controllers/paymentController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect);

router.post('/createIntent', paymentController.makePayment);

router.post('/chargeIntent', paymentController.chargePayment);

// router
//   .route('/')
//   .get(paymentController.getAllBookings)
//   .post(paymentController.createBooking);

module.exports = router;
