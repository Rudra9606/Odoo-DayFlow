const express = require('express');
const { body, validationResult } = require('express-validator');
const Task = require('../models/Task');
const router = express.Router();

// Create task
router.post('/', [
  body('employee').notEmpty(),
  body('title').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const task = await Task.create(req.body);
    res.status(201).json({ success: true, task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get today's tasks for employee
router.get('/today/:employeeId', async (req, res) => {
  try {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    const tasks = await Task.find({
      employee: req.params.employeeId,
      date: { $gte: today, $lt: tomorrow }
    }).sort({ createdAt: -1 });

    res.json({ success: true, tasks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update task status
router.put('/:id', async (req, res) => {
  try {
    const { status, startTime, endTime } = req.body;
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    if (status) task.status = status;
    if (startTime) task.startTime = new Date(startTime);
    if (endTime) {
      task.endTime = new Date(endTime);
      if (task.startTime) {
        task.timeSpent = Math.round((task.endTime - task.startTime) / (1000 * 60));
      }
    }

    await task.save();
    res.json({ success: true, task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all tasks for employee
router.get('/employee/:employeeId', async (req, res) => {
  try {
    const tasks = await Task.find({ employee: req.params.employeeId })
      .sort({ createdAt: -1 })
      .limit(50);
    
    const stats = {
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'completed').length,
      inProgress: tasks.filter(t => t.status === 'in-progress').length,
      pending: tasks.filter(t => t.status === 'pending').length
    };

    res.json({ success: true, tasks, stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
