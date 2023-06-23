const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');
const AppError = require('../utils/appError');
const Insight = require('../models/Insight');
const User = require('../models/User');
const Reward = require('../models/Reward');
const multer = require('multer');
const sharp = require('sharp');

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

  console.log(req.user);

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

  // 1) Get the user
  const newUser = await User.findById({ _id: req?.body?.user });

  if (!newUser) {
    return next(new AppError('No such User Found', 404));
  }

  if (
    !user ||
    !title ||
    !minParticipants ||
    !maxParticipants ||
    !expirationDate ||
    !participantPercentage ||
    !discount ||
    !maxPurchaseValue ||
    !deadline ||
    !surveyQuestions
  ) {
    return next(new AppError('Please fill all the fields', 404));
  }

  //Comment this for postman Testing

  [req.body.surveyQuestions, req.body.expirationDate, req.body.deadline] = [
    JSON.parse(req.body.surveyQuestions),
    JSON.parse(req.body.expirationDate),
    JSON.parse(req.body.deadline),
  ];

  try {
    const insight = await Insight.create(req.body);

    res.status(200).json({
      status: 'success',
      data: {
        data: insight,
      },
    });
  } catch (error) {
    return next(new AppError(error, 500));
  }
});

exports.getAllInsights = factory.getAll(Insight);

exports.updateInsight = factory.updateOne(Insight);

exports.addResponse = catchAsync(async (req, res, next) => {
  const { userID, surveyResponse, insightID } = req.body;

  // 1) Get the user
  const newUser = await User.findById({ _id: req?.body?.userID });

  if (!newUser) {
    return next(new AppError('No such User Found', 404));
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

  // 4) Update the surveyResponses array
  insight.surveyResponses.push({
    userID: newUser._id,
    response: surveyResponse,
  });

  const updatedInsight = await insight.save();

  const reward = Reward.create({
    user: newUser._id,
    survey: insight._id,
  });

  res.status(200).json({
    status: 'success',
    data: {
      insight: updatedInsight,
      reward: reward,
    },
  });
});
