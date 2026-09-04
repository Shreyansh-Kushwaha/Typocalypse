import mongoose from 'mongoose';

// Every context a finished passage can come from. Keep this list in sync
// with the client - unknown contexts fall back to 'solo'.
export const SESSION_CONTEXTS = [
  'solo', 'drill', 'multiplayer', 'ghost',
  'test', 'code', 'campaign', 'radio', 'memory', 'library', 'duel', 'arcade', 'lesson',
];

// One finished typing passage - solo story, drill, multiplayer leg, timed test...
const statsSessionSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  username: { type: String, required: true },
  context: { type: String, enum: SESSION_CONTEXTS, default: 'solo' },
  mode: { type: String }, // genre for solo, mode key for multiplayer, test15/test30/test60, language for code...
  wpm: { type: Number, required: true },
  accuracy: { type: Number, required: true },
  errors: { type: Number, default: 0 },
  totalTyped: { type: Number, default: 0 },
  durationMs: { type: Number, default: 0 },
  // timed tests: 0-100 consistency score (100 - coefficient of variation of per-second wpm)
  consistency: { type: Number },
  // per-character stats: { "e": { h: 41, m: 3 }, ... } h=hits m=misses
  keyStats: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

statsSessionSchema.index({ createdAt: -1 });
statsSessionSchema.index({ context: 1, mode: 1, wpm: -1 });

export default mongoose.model('StatsSession', statsSessionSchema);
