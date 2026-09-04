import mongoose from 'mongoose';

// followerId follows followingId. One edge per pair.
const followSchema = new mongoose.Schema({
  followerId: { type: String, required: true, index: true },
  followingId: { type: String, required: true, index: true },
}, { timestamps: true });

followSchema.index({ followerId: 1, followingId: 1 }, { unique: true });

export default mongoose.model('Follow', followSchema);
