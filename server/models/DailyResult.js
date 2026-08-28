import mongoose from 'mongoose';

// One attempt per player per daily challenge.
const dailyResultSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  username: { type: String, required: true },
  day: { type: Number, required: true }, // UTC day index (unix ms / 86400000)
  wpm: { type: Number, required: true },
  accuracy: { type: Number, required: true },
  errors: { type: Number, default: 0 },
  durationMs: { type: Number, default: 0 },
}, { timestamps: true });

dailyResultSchema.index({ userId: 1, day: 1 }, { unique: true });
dailyResultSchema.index({ day: 1, wpm: -1 });

export default mongoose.model('DailyResult', dailyResultSchema);
