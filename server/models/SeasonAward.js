import mongoose from 'mongoose';

// Written once per finished season per placed player - makes award jobs idempotent.
const seasonAwardSchema = new mongoose.Schema({
  season: { type: String, required: true },   // 'YYYY-MM'
  number: { type: Number, required: true },   // season 1, 2, ...
  userId: { type: String, required: true },
  username: { type: String, required: true },
  rank: { type: Number, required: true },
  bestWpm: { type: Number, required: true },
  title: { type: String, required: true },
}, { timestamps: true });

seasonAwardSchema.index({ season: 1, userId: 1 }, { unique: true });
seasonAwardSchema.index({ season: 1, rank: 1 });

export default mongoose.model('SeasonAward', seasonAwardSchema);
