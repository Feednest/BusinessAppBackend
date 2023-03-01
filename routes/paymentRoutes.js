const express = require('express');
const paymentController = require('../controllers/paymentController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect);

router.post('/charge', paymentController.makePayment);

// router.use(authController.restrictTo('admin', 'lead-guide'));

// router
//   .route('/')
//   .get(paymentController.getAllBookings)
//   .post(paymentController.createBooking);

// router
//   .route('/:id')
//   .get(paymentController.getBooking)
//   .patch(paymentController.updateBooking)
//   .delete(paymentController.deleteBooking);

module.exports = router;
