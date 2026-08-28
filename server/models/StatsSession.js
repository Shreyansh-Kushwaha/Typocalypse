import mongoose from 'mongoose';

// One finished typing passage - solo story, drill, or multiplayer leg
const statsSessionSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  username: { type: String, required: true },
  context: { type: String, enum: ['solo', 'drill', 'multiplayer', 'ghost'], default: 'solo' },
  mode: { type: String }, // genre for solo, mode key for multiplayer
  wpm: { type: Number, required: true },
  accuracy: { type: Number, required: true },
  errors: { type: Number, default: 0 },
  totalTyped: { type: Number, default: 0 },
  durationMs: { type: Number, default: 0 },
  // per-character stats: { "e": { h: 41, m: 3 }, ... } h=hits m=misses
  keyStats: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

statsSessionSchema.index({ createdAt: -1 });

export default mongoose.model('StatsSession', statsSessionSchema);
