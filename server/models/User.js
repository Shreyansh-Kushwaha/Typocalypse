import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 50
  },
  email: {
    type: String,
    // Guests have no email. The unique index must be sparse so multiple
    // guest documents without an email do not collide on null.
    required: function() { return !this.isGuest; },
    unique: true,
    sparse: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: function() { return !this.isGuest; },
    minlength: 6
  },
  isGuest: {
    type: Boolean,
    default: false
  },
  currentStreak: { type: Number, default: 0 },
  longestStreak: { type: Number, default: 0 },
  lastPlayedDay: { type: String }, // UTC day 'YYYY-MM-DD'

  // ---- progression ----
  xp: { type: Number, default: 0 },
  // [{ key, at }] - unlocked achievement keys (definitions live in progression.js)
  achievements: { type: [{ key: String, at: Date }], default: [] },
  // equipped cosmetics; the catalog and unlock rules live in progression.js
  cosmetics: {
    theme: { type: String, default: 'brutal' },
    caret: { type: String, default: 'block' },
    sound: { type: String, default: 'synth' },
    title: { type: String, default: '' },
  },
  // lifetime counters the achievement engine reads (cheap, no aggregation)
  counters: { type: mongoose.Schema.Types.Mixed, default: {} },

  // ---- competitive ----
  rating: { type: Number, default: 1000 },
  ratingGames: { type: Number, default: 0 },
  duelWins: { type: Number, default: 0 },
  duelLosses: { type: Number, default: 0 },

  // ---- seasons: [{ season: '2026-09', number: 1, rank: 1, title: 'Season 1 Champion' }]
  seasonTitles: { type: [{ season: String, number: Number, rank: Number, title: String }], default: [] },

  // ---- campaign progress: { stars: { nodeId: 0-3 }, cleared: [nodeId] }
  campaign: { type: mongoose.Schema.Types.Mixed, default: {} },

  // ---- notifications ----
  notify: {
    email: { type: Boolean, default: false },
    push: { type: Boolean, default: true },
    lastReminderDay: { type: String },
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false; // guests have no password to match
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model('User', userSchema);
