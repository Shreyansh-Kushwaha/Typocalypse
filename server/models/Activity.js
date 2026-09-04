import mongoose from 'mongoose';

// One line in the social feed. Written by logActivity() in activity.js.
// type: personal_best | daily | achievement | level | ghost_shared | match_win | duel |
//       tournament | story_published | meteor | campaign | follow
const activitySchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  username: { type: String, required: true },
  type: { type: String, required: true },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

activitySchema.index({ createdAt: -1 });
activitySchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('Activity', activitySchema);
