import mongoose from 'mongoose';

// Genres a story can be filed under. Solo games carry their own genre; relay
// chronicles pick one when they publish, unknown values fall back to 'custom'.
export const STORY_GENRES = ['fantasy', 'horror', 'sci-fi', 'mystery', 'adventure', 'romance', 'custom'];

const passageSchema = new mongoose.Schema({
  text: { type: String, required: true },
  by: { type: String, default: '' },     // who typed this passage (relay) / the author (solo)
  choice: { type: String, default: '' }, // the branch taken AFTER this passage, '' for the last one
}, { _id: false });

// A published story in the library. Built from a solo game's history or a
// Relay Chronicles room; readers can type it, like it, and share the link.
const storySchema = new mongoose.Schema({
  authorId: { type: String, required: true, index: true },
  authorName: { type: String, required: true },
  title: { type: String, required: true, minlength: 3, maxlength: 80 },
  genre: { type: String, default: 'fantasy' },
  source: { type: String, enum: ['solo', 'relay'], default: 'solo' },
  passages: { type: [passageSchema], default: [] },
  likes: { type: Number, default: 0 },
  likedBy: { type: [String], default: [] },
  // everyone who has EVER liked it - author XP is granted once per liker so toggling cannot farm
  likedEver: { type: [String], default: [] },
  plays: { type: Number, default: 0 },
  wordCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

storySchema.index({ createdAt: -1 });
storySchema.index({ likes: -1, createdAt: -1 });
storySchema.index({ plays: -1, createdAt: -1 });
storySchema.index({ genre: 1, createdAt: -1 });

export default mongoose.model('Story', storySchema);
