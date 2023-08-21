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

router.patch('/:id', notificationController.updateNotificationIsReadStatus);

// router.get('/all', notificationController.getAllNotifications);
// router.patch('/all', notificationController.updateAllNotifications);

module.exports = router;
