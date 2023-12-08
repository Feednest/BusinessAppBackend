const express = require('express');
const router = express.Router();

const rewardController = require('../controllers/rewardController');
const authController = require('../controllers/authController');

router.use(authController.protect);

router.get('/', rewardController.getAllRewards);

router.post('/verify/pin', rewardController.verifyRewardWithPin);
router.post(
  '/verifyReward',
  rewardController.uploadRewardPhoto,
  rewardController.verifyReward
);

module.exports = router;
