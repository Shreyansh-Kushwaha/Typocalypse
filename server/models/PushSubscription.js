import mongoose from 'mongoose';

// One Web Push subscription per browser/device. A user can have several.
const pushSubscriptionSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  endpoint: { type: String, required: true, unique: true },
  keys: {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true },
  },
  userAgent: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('PushSubscription', pushSubscriptionSchema);
