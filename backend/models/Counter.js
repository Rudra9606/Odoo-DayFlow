const mongoose = require('mongoose');

/**
 * Counter Model for Auto-Generated User IDs
 * Maintains atomic counters for unique user IDs per company and year
 */
const counterSchema = new mongoose.Schema({
  // Key format: "COMPANY_YEAR" e.g., "DayFlow_2025"
  key: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  // Sequential counter starting from 1
  seq: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for performance
counterSchema.index({ key: 1 });

// Static method to get next sequence number atomically
counterSchema.statics.getNextSequence = function(key) {
  return this.findOneAndUpdate(
    { key: key.toUpperCase() },
    { $inc: { seq: 1 } },
    {
      new: true, // Return the updated document
      upsert: true, // Create if doesn't exist
      setDefaultsOnInsert: true
    }
  );
};

module.exports = mongoose.model('Counter', counterSchema);