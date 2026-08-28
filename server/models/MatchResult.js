import mongoose from 'mongoose';

const matchResultSchema = new mongoose.Schema({
  roomCode: { type: String, required: true },
  mode: { type: String, required: true },
  genre: { type: String },
  players: [{
    userId: { type: String },
    name: { type: String },
  }],
  results: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

export default mongoose.model('MatchResult', matchResultSchema);
