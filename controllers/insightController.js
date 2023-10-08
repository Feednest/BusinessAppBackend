const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');
const AppError = require('../utils/appError');
const Insight = require('../models/Insight');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Reward = require('../models/Reward');
const multer = require('multer');
const sharp = require('sharp');
const QRCode = require('qrcode');
const dotenv = require('dotenv');
const axios = require('axios');
const APIFeatures = require('../utils/apiFeatures');
var mongoose = require('mongoose');

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

  console.log(req.body);

  // 1) Get the user
  const newUser = await User.findById({ _id: req?.body?.user });

  if (!newUser) {
    return next(new AppError('No such User Found', 404));
  }

  // console.log(expirationDate);
  // console.log(deadline);

  // if (
  //   !user ||
  //   !title ||
  //   !minParticipants ||
  //   !maxParticipants ||
  //   !expirationDate ||
  //   !participantPercentage ||
  //   !discount ||
  //   !maxPurchaseValue ||
  //   !deadline ||
  //   !surveyQuestions
  // ) {
  //   return next(new AppError('Please fill all the fields', 404));
  // }

  //Comment this for postman Testing

  [req.body.surveyQuestions, req.body.expirationDate, req.body.deadline] = [
    JSON.parse(req.body.surveyQuestions),
    JSON.parse(req.body.expirationDate),
    JSON.parse(req.body.deadline),
  ];

  let genders = req.body?.gender;

  if (req.body?.gender?.includes(',')) {
    genders = req.body?.gender?.split(',');
  }

  try {
    const insight = await Insight.create({ ...req.body, gender: genders });

    res.status(200).json({
      status: 'success',
      data: {
        data: insight,
      },
    });
  } catch (error) {
    console.error(error);
    return next(new AppError(error, 500));
  }
});

function isDuplicate(id, doc) {
  if (doc && doc.length > 0) {
    for (let i = 0; i < doc.length; i++) {
      if (doc[i]._id.toString() === id.toString()) {
        return true;
      }
    }
  }
  return false;
}

exports.getAllInsights = catchAsync(async (req, res, next) => {
  let filter = {};

  const append = req?.query?.append;

  console.log(req.query);

  const minAge = req?.query?.minAge?.lte;
  const maxAge = req?.query?.maxAge?.gte;
  const gender = req?.query?.gender;

  let allInsights;

  allInsights = await Insight.find({});

  const features = new APIFeatures(Insight.find(filter), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const doc = await features.query;

  const filteredResponses = [];

  allInsights.forEach((response) => {
    if (
      response.gender.length === 0 &&
      !response.minAge &&
      !response.maxAge &&
      !isDuplicate(response._id, doc)
    ) {
      filteredResponses.push(response);
    }
    if (response.gender.length > 0 && response.minAge && response.maxAge) {
      if (
        response.gender.includes(gender) &&
        response?.minAge <= minAge &&
        response?.maxAge >= maxAge
      ) {
        filteredResponses.push(response);
      }
    } else if (response.gender.length > 0 && response.minAge) {
      if (response.gender.includes(gender) && response?.minAge <= minAge) {
        filteredResponses.push(response);
      }
    } else if (response.gender.length > 0) {
      if (response.gender.includes(gender)) {
        filteredResponses.push(response);
      }
    } else if (response.minAge && response.maxAge) {
      if (response.minAge <= minAge && response.maxAge >= maxAge) {
        filteredResponses.push(response);
      }
    } else if (response.minAge) {
      if (response.minAge <= minAge) {
        filteredResponses.push(response);
      } else if (response.maxAge) {
        if (response.maxAge >= maxAge) {
          filteredResponses.push(response);
        }
      }
    }
  });

  const updatedDoc = doc.concat(filteredResponses);

  // console.log(updatedDoc);

  res.status(200).json({
    status: 'success',
    results:
      append == undefined || append == 'false' ? doc.length : updatedDoc.length,
    data: {
      data: append == undefined || append == 'false' ? doc : updatedDoc,
    },
  });
});

//Get specific user's insights
exports.getMyInsights = catchAsync(async (req, res, next) => {
  try {
    const userID = req?.params?.id;

    const insights = await Insight.find({
      'surveyResponses.userID': mongoose.Types.ObjectId(userID),
    });

    console.log(insights);

    const userResponses = insights.map((insight) => {
      const responses = insight.surveyResponses.find(
        (response) => response.userID.toString() === userID
      );
      return {
        // insightId: insight._id,
        insight: insight,
        responses: responses ? responses.response : [],
      };
    });

    res.json(userResponses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

exports.updateInsight = factory.updateOne(Insight);

exports.addResponse = catchAsync(async (req, res, next) => {
  const { userID, surveyResponse, insightID } = req.body;

  // 1) Get the user
  const newUser = await User.findById({ _id: req?.body?.userID });

  if (!newUser) {
    return next(new AppError('No such User Found', 404));
  }

  if (newUser?.role !== 'customer') {
    return next(new AppError('Only customers can submit responses', 404));
  }

  // 2) Find the insight object
  const insight = await Insight.findById(insightID);

  if (!insight) {
    return next(new AppError('No such Insight Found', 404));
  }

  // 3) Check if the user has already submitted a response
  const hasSubmittedResponse = insight.surveyResponses.some(
    (response) => response.userID.toString() === newUser._id.toString()
  );

  if (hasSubmittedResponse) {
    return next(
      new AppError('This user has already submitted its response', 400)
    );
  }

  if (insight.submissions >= insight.maxParticipants) {
    return next(
      new AppError(
        'This survey has reached its maximum number of participants',
        400
      )
    );
  }

  // 4) Update the surveyResponses array
  insight.surveyResponses.push({
    userID: newUser._id,
    response: surveyResponse,
  });

  insight.submissions = insight.submissions + 1;

  if (insight.submissions === insight.maxParticipants) {
    insight.status = 'completed';
  }

  const updatedInsight = await insight.save();

  const expireAt = new Date();

  expireAt.setDate(new Date().getDate() + updatedInsight?.rewardExpiry);

  const reward = new Reward({
    user: newUser._id,
    survey: insight._id,
    expireAt: expireAt,
    available: true,
  });

  const filename = `reward-${req?.user?._id}-${Date.now()}.png`;

  QRCode.toFile(
    `public/img/rewards/${filename}`,
    `${process.env.QR_CODE_SECRET}*${reward._id}`,
    {
      errorCorrectionLevel: 'H',
      type: 'png',
    },
    function (err, data) {
      if (err) throw err;
    }
  );

  reward.image = filename;

  const savedReward = await reward.save();

  const notification = await Notification.findOne({
    user: insight?.user.valueOf(),
  });

  const name = newUser?.nickname === undefined ? 'customer' : newUser?.nickname;

  await fetch(`${process.env.URL}api/v1/notification/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: `${name} has submitted a response to your survey`,
      body: 'Click here to view survey',
      user: insight?.user.valueOf(),
      tokenID: notification?.tokenID,
      image: null,
      data: 'test',
      navigate: 'Stats',
      id: mongoose.Types.ObjectId().valueOf(),
    }),
  });

  const rewardNotif = await Notification.findOne({
    user: newUser._id,
  });

  await fetch(`${process.env.URL}api/v1/notification/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: `Your Reward for ${insight?.title} is ready`,
      body: 'Click here to view reward',
      user: savedReward?.user,
      tokenID: rewardNotif?.tokenID,
      image: null,
      data: 'test',
      navigate: 'Rewards',
      id: mongoose.Types.ObjectId().valueOf(),
    }),
  });

  const notification2 = await Notification.findOne({
    user: req?.body?.userID,
  });

  await fetch(`${process.env.URL}api/v1/notification/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: `Your response has been submitted successfully`,
      body: 'Click here to view survey',
      user: req?.body?.userID,
      tokenID: notification2?.tokenID,
      image: null,
      data: 'test',
      navigate: 'Home',
      id: mongoose.Types.ObjectId().valueOf(),
    }),
  });

  if (updatedInsight.submissions === updatedInsight.maxParticipants) {
    await fetch(`${process.env.URL}api/v1/notification/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: `${insight?.title} survey, ${insight.maxParticipants} people completed`,
        body: 'Click here to view survey',
        user: insight?.user.valueOf(),
        tokenID: notification?.tokenID,
        image: null,
        data: 'test',
        navigate: 'Stats',
        id: mongoose.Types.ObjectId().valueOf(),
      }),
    });
  }

  res.status(200).json({
    status: 'success',
    data: {
      insight: updatedInsight,
      reward: reward,
    },
  });
});
