const express = require('express');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/socialLogin', authController.socialLogin);
router.get('/logout', authController.logout);

router.post('/verifyToken', authController.isLoggedIn);

router.post('/forgotPassword', authController.forgotPassword);

router
  .route('/resetPassword/:token')
  .post(authController.resetPassword)
  .get(authController.renderResetPassword);

router.route('/verifyOTP').post(authController.verifyOTP);

router.route('/checkVerifyOTP').post(authController.checkVerifyOTP);

router.get('/renderPug/:token', authController.renderPug);

// Protect all routes after this middleware
router.use(authController.protect);

router.patch('/updateMyPassword', authController.updatePassword);
router.get('/me', userController.getMe, userController.getUser);
router.patch(
  '/updateMe',
  userController.uploadUserPhoto,
  userController.resizeUserPhoto,
  userController.updateMe
);
router.delete('/deleteMe', userController.deleteMe);

router.use(authController.restrictTo('admin'));

router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);

router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
