import mongoose from 'mongoose';

const gameSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  currentStory: {
    type: String,
    required: false,
    default: ''
  },
  choices: [{
    type: String
  }],
  progress: {
    type: Number,
    default: 0
  },
  genre: {
    type: String,
    enum: ['fantasy', 'horror', 'sci-fi', 'mystery', 'adventure', 'romance', 'custom'],
    default: 'fantasy'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
gameSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('Game', gameSchema);