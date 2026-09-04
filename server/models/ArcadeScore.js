import mongoose from 'mongoose';

// One row per player per arcade game - only the personal best is kept.
const arcadeScoreSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  username: { type: String, required: true },
  game: { type: String, required: true }, // 'meteor' (more arcade games later)
  score: { type: Number, required: true },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} }, // { wave, kills, durationMs }
}, { timestamps: true });

arcadeScoreSchema.index({ userId: 1, game: 1 }, { unique: true });
arcadeScoreSchema.index({ game: 1, score: -1 });

export default mongoose.model('ArcadeScore', arcadeScoreSchema);
