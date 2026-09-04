import Activity from './models/Activity.js';

// Append a line to the social feed. Never throws - the feed is best effort.
export async function logActivity(userId, username, type, data = {}) {
  try {
    await Activity.create({ userId: String(userId), username, type, data });
  } catch (err) {
    console.error('Activity log error:', err.message);
  }
}
