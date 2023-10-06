const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');
const AppError = require('../utils/appError');
const Insight = require('../models/Insight');
const User = require('../models/User');
const Reward = require('../models/Reward');
const Notification = require('../models/Notification');
const mongoose = require('mongoose');
const Jimp = require('jimp');
const fs = require('fs');
const qrCodeReader = require('qrcode-reader');
const multer = require('multer');
const dotenv = require('dotenv');

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

exports.uploadRewardPhoto = upload.single('qrcode');

exports.getAllRewards = factory.getAll(Reward);

exports.verifyReward = catchAsync(async (req, res, next) => {
  // 1) Get the user
  const newUser = await User.findById({ _id: req?.body?.userID });
  const value = req?.body?.value;

  if (!newUser) {
    return next(new AppError('No such User Found', 404));
  }

  try {
    // const buffer = req?.file?.buffer;

    // // __ Parse the image using Jimp.read() __ \\
    // Jimp.read(buffer, function (err, image) {
    //   if (err) {
    //     return next(new AppError('Jimp Error Occured', 400));
    //   }
    //   // __ Creating an instance of qrcode-reader __ \\

    //   const qrCodeInstance = new qrCodeReader();

    //   qrCodeInstance.callback = async function (err, value) {
    //     if (err) {
    //       return next(new AppError('qr code reader error occured', 400));
    //     }

    const values = value.split('*');

    if (values[0] !== process.env.QR_CODE_SECRET) {
      return next(new AppError('Invalid QR Code', 400));
    }

    const reward = await Reward.findById(values[1]);

    if (!reward) {
      return next(new AppError('No such Reward Found', 404));
    }

    if (new Date(reward?.expireAt) < new Date()) {
      return next(new AppError('Reward Expired', 400));
    }

    if (reward?.claimed == true) {
      return next(new AppError('Reward already claimed', 400));
    }

    if (reward?.available == false) {
      return next(new AppError('Reward Not Avaliable yet', 400));
    }

    reward.claimed = true;
    reward.available = false;

    const notification = await Notification.findOne({
      user: values[1],
    });

    await fetch(`${process.env.URL}api/v1/notification/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: `Reward has been Claimed`,
        body: 'Click here to view Reward',
        user: values[1],
        tokenID: notification?.tokenID,
        image: null,
        data: 'test',
        navigate: 'Rewards',
        id: mongoose.Types.ObjectId().valueOf(),
      }),
    });

    await reward.save();

    return res.status(200).json({
      status: 'success',
      data: {
        data: reward,
      },
    });
  } catch (error) {
    return next(new AppError(error, 500));
  }
});
