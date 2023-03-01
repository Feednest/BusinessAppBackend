const express = require('express');
const router = express.Router();

const insightController = require('../controllers/insightController');
const authController = require('../controllers/authController');

router.use(authController.protect);

router
  .route('/')
  .post(
    insightController.uploadInsightPhotos,
    insightController.resizeInsightPhotos,
    insightController.createInsight
  )
  .get(insightController.getAllInsights);

module.exports = router;
