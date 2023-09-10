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

router.patch('/:id', insightController.updateInsight);

//get user's insight responses
router.get('/:id', insightController.getMyInsights);

router.post('/addResponse', insightController.addResponse);

module.exports = router;
