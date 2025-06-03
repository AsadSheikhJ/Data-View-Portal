const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  directoryPath: {
    type: String,
    required: true,
    trim: true
  },
  allowedSubDirectories: [{
    path: {
      type: String,
      required: true,
      trim: true
    },
    description: String
  }],
  users: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['viewer', 'editor', 'admin'],
      default: 'viewer'
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp before saving
groupSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Group = mongoose.model('Group', groupSchema);

module.exports = Group; 