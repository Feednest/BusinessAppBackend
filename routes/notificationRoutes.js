const express = require('express');
const notificationController = require('../controllers/notificationController');

const router = express.Router();

router.post('/send', notificationController.sendNotification);

router
  .route('/')
  .get(notificationController.getNotifications)
  .post(notificationController.registerNotification)
  .patch(notificationController.updateNotification)
  .delete(notificationController.deleteNotification);

module.exports = router;
