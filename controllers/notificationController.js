// importing utils
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');
const mongoose = require('mongoose');

const Notification = require('../models/Notification');

const path = require('path');

const admin = require('firebase-admin');
const { token } = require('morgan');

exports.registerNotification = catchAsync(async (req, res, next) => {
  const { user, tokenID } = req.body;

  const objID = mongoose.Types.ObjectId.isValid(user)
    ? mongoose.Types.ObjectId(user)
    : null;

  if (!objID) {
    return next(new AppError('Invalid User ID', 400));
  }
  const obj = await Notification.findOne({ user: user });

  if (obj)
    return res.status(200).json({
      status: 'success',
      data: {
        message: 'Token already registered!',
      },
    });

  return factory.createOne(Notification)(req, res, next);
});

exports.updateNotification = catchAsync(async (req, res, next) => {
  const userID = req?.query?.userid;
  const tokenID = req?.body?.tokenID;

  const objID = mongoose.Types.ObjectId.isValid(userID)
    ? mongoose.Types.ObjectId(userID)
    : null;

  if (!objID) {
    return next(new AppError('Invalid User ID', 400));
  }

  const obj = await Notification.findOne({ user: userID });

  if (!obj) {
    console.log(tokenID, userID);

    req.body.user = userID;
    req.body.tokenID = tokenID;

    return factory.createOne(Notification)(req, res, next);
  }

  req.params.id = obj._id;
  return factory.updateOne(Notification)(req, res, next);
});

exports.sendNotification = catchAsync(async (req, res, next) => {
  try {
    const { title, body, navigate, tokenID, image, user, data, id } = req.body;

    const obj = await Notification.findOne({ user: user });

    if (!obj) {
      return next(
        new AppError('No Such User with Notifications Object Found', 404)
      );
    }

    const notification = {
      title: title ? title : 'New Notification',
      body: body ? body : 'Click here to view',
      createdAt: Date(),
      isRead: false,
      data: {
        navigate: navigate ? navigate : 'Rewards',
        image: image ? image : 'default',
        id: id ? id : mongoose.Types.ObjectId().valueOf(),
        data: data ? data : null,
      },
      android: {
        smallIcon: 'ic_launcher_round',
        channelId: 'default',
        importance: 4,
        pressAction: {
          id: 'default',
        },
        actions: [
          {
            title: 'Mark as Read',
            pressAction: {
              id: 'read',
            },
          },
        ],
      },
    };

    obj.notifications.push(notification);
    await obj.save();

    await admin.messaging().sendMulticast({
      tokens: [tokenID],
      data: {
        notifee: JSON.stringify(notification),
      },
    });

    res.status(200).json({ message: 'Successfully sent notifications!' });
  } catch (err) {
    res
      .status(err.status || 500)
      .json({ message: err.message || 'Something went wrong!' });
  }
});

exports.deleteNotification = catchAsync(async (req, res, next) => {
  const { id } = req.query;

  if (!id) {
    return next(new AppError('You must provide a notification ID', 400));
  }

  const notification = await Notification.findOne({
    notifications: { $elemMatch: { 'data.id': id } },
  });

  if (!notification) {
    return next(new AppError('No such notification found', 404));
  }

  const matchingNotification = notification.notifications.find(
    (notification) => notification.data.id === id
  );

  notification.notifications.pull(matchingNotification);

  await notification.save();

  return res.status(200).json({
    status: 'success',
    data: {
      message: 'Successfully deleted notification',
    },
  });
});

exports.getNotifications = catchAsync(async (req, res, next) => {
  const { user } = req.query;

  const objID = mongoose.Types.ObjectId.isValid(user)
    ? mongoose.Types.ObjectId(user)
    : null;

  if (!objID) {
    return next(new AppError('Invalid User ID', 400));
  }

  const obj = await Notification.findOne({ user: user });

  if (!obj) {
    return next(
      new AppError('No Such User with Notifications Object Found', 404)
    );
  }

  return res.status(200).json({
    status: 'success',
    obj,
  });
});

exports.updateNotificationIsReadStatus = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  // update isRead status of the notif
  const obj = await Notification.findOneAndUpdate(
    {
      notifications: { $elemMatch: { 'data.id': id } },
    },
    {
      $set: {
        'notifications.$.isRead': true,
      },
    },
    {
      new: true,
    }
  );

  if (!obj) {
    return next(
      new AppError('No Such User with Notifications Object Found', 404)
    );
  }

  return res.status(200).json({
    status: 'success',
    obj,
  });
});

// temp functions
// exports.getAllNotifications = catchAsync(async (req, res, next) => {
//   const obj = await Notification.find();

//   if (!obj) {
//     return next(
//       new AppError('No Such User with Notifications Object Found', 404)
//     );
//   }

//   return res.status(200).json({
//     status: 'success',
//     obj,
//   });
// });

// exports.updateAllNotifications = catchAsync(async (req, res, next) => {
//   const response = await Notification.updateMany(
//     {},
//     {
//       $set: {
//         'notifications.$[].id': uuidv4(),
//         'notifications.$[].isRead': false,
//       },
//     }
//   );

//   return res.status(200).json({
//     status: 'success',
//     data: {
//       message: 'Successfully updated all notifications',
//       data: response,
//     },
//   });
// });
