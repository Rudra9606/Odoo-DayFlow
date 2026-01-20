const express = require('express');
const { body, validationResult } = require('express-validator');
const Activity = require('../models/Activity');
const router = express.Router();

// Update activity status
router.post('/status', [
  body('employeeId').notEmpty(),
  body('status').isIn(['working', 'break', 'meeting', 'away'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { employeeId, status, activity, location } = req.body;
    
    const activityRecord = await Activity.create({
      employee: employeeId,
      status,
      activity,
      location
    });

    res.status(201).json({ success: true, data: activityRecord });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get current status
router.get('/status/:employeeId', async (req, res) => {
  try {
    const latestActivity = await Activity.findOne({ employee: req.params.employeeId })
      .sort({ timestamp: -1 });
    
    res.json({ success: true, data: latestActivity });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get activity history
router.get('/history/:employeeId', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const filter = { employee: req.params.employeeId };
    
    if (startDate && endDate) {
      filter.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const activities = await Activity.find(filter)
      .sort({ timestamp: -1 })
      .limit(100);
    
    res.json({ success: true, data: activities });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
