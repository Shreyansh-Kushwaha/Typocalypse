import mongoose from 'mongoose';

// A recorded run: times[i] = ms offset when the i-th correct character landed.
// The text plus that array replays the whole run.
const ghostSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  username: { type: String, required: true },
  text: { type: String, required: true },
  times: { type: [Number], required: true },
  wpm: { type: Number, required: true },
  accuracy: { type: Number, required: true },
  genre: { type: String, default: 'fantasy' },
}, { timestamps: true });

export default mongoose.model('Ghost', ghostSchema);
