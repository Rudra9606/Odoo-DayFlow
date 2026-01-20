const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['working', 'break', 'meeting', 'away'],
    default: 'working'
  },
  activity: String,
  location: {
    latitude: Number,
    longitude: Number
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('Activity', activitySchema);
