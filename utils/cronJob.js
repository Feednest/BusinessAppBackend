const cron = require('node-cron');

const Insight = require('../models/Insight');

exports.default = cron.schedule('0 0 * * *', async () => {
  const currentDate = new Date();
  const expiredInsights = await Insight.find({
    expirationDate: { $lt: currentDate },
  });

  for (const insight of expiredInsights) {
    insight.status = 'completed';
    await insight.save();
  }
  console.log('Insights updated');
});
