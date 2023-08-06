const cron = require('node-cron');

const Insight = require('../models/Insight');
const Reward = require('../models/Reward');
const Notification = require('../models/Notification');
const mongoose = require('mongoose');
const fetch = require('node-fetch');

function selectRewardsRandomly(rewards, percentage) {
  const selectedRewards = [];
  const numRewardsToSelect = Math.ceil((percentage / 100) * rewards.length);

  for (let i = 0; i < numRewardsToSelect; i++) {
    const randomIndex = Math.floor(Math.random() * rewards.length);
    selectedRewards.push(rewards[randomIndex]);
    rewards.splice(randomIndex, 1);
  }

  return selectedRewards;
}

// */10 * * * * *
exports.default = cron.schedule('*/10 * * * * *', async () => {
  const currentDate = new Date();
  const expiredInsights = await Insight.find({
    expirationDate: { $lt: currentDate },
  });

  

  for (const insight of expiredInsights) {
    if (
      insight.submissions >= insight.minParticipants &&
      insight.status === 'active'
    ) {
      try {
        let rewards = await Reward.find({
          survey: insight?._id,
        });

        let notification;

        if(insight.participantPercentage !== 100) {
          const selectedRewards = selectRewardsRandomly(rewards, insight.participantPercentage);
          rewards = selectedRewards;
        }

        for (const reward of rewards) {
          notification = await Notification.findOne({
            user: reward?.user,
          });

          reward.available = true;
          await reward.save();

          await fetch(`${process.env.URL}api/v1/notification/send`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              title: `Your Reward for ${insight?.title} is ready`,
              body: 'Click here to view reward',
              user: reward?.user,
              tokenID: notification?.tokenID,
              image: null,
              data: 'test',
              navigate: 'Rewards',
              id: mongoose.Types.ObjectId().valueOf(),
            }),
          });
        }

        notification = await Notification.findOne({
          user: insight?.user,
        });

        await fetch(`${process.env.URL}api/v1/notification/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: `${insight?.title} survey has ended`,
            body: 'Click here to view survey',
            user: insight?.user,
            tokenID: notification?.tokenID,
            image: null,
            data: 'test',
            navigate: 'Stats',
            id: mongoose.Types.ObjectId().valueOf(),
          }),
        });

        insight.status = 'completed';
        await insight.save();
      } catch (err) {
        console.log(err);
      }
    }
  }
  console.log('Insights updated');
});
