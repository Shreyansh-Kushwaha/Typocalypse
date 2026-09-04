import mongoose from 'mongoose';

// One scheduled weekend tournament. Written by the orchestrator in
// multiplayer/tournaments.js and the registration routes.
const entrantSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  username: { type: String, required: true },
  registeredAt: { type: Date, default: Date.now },
}, { _id: false });

const heatSchema = new mongoose.Schema({
  roomCode: { type: String, required: true },
  players: { type: [String], default: [] },       // userIds
  winner: { type: String, default: null },        // userId
  placements: { type: mongoose.Schema.Types.Mixed, default: [] },
  state: { type: String, default: 'waiting' },    // waiting | running | done | cancelled
}, { _id: false });

const tournamentSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true },   // '2026-W36' (or 'test-…' under TOURNAMENT_START_IN_MIN)
  name: { type: String, required: true },                 // 'Weekend Royale #N'
  number: { type: Number, default: 1 },
  mode: { type: String, default: 'royale' },
  genre: { type: String, default: 'fantasy' },
  startsAt: { type: Date, required: true, index: true },
  state: { type: String, default: 'open', index: true }, // open | starting | running | finished | cancelled
  entrants: { type: [entrantSchema], default: [] },
  heats: { type: [heatSchema], default: [] },
  final: { type: mongoose.Schema.Types.Mixed, default: null }, // { roomCode, players: [userId], placements }
  winner: { type: { userId: String, username: String }, default: null },
  finishedAt: { type: Date },
  cancelReason: { type: String },
}, { timestamps: true });

export default mongoose.model('Tournament', tournamentSchema);
