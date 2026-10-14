const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    session_id: { type: String, required: true },
    type: { type: String, enum: ['page_view', 'click'], required: true },
    url: { type: String, required: true },   // full URL as seen by the browser
    page: { type: String, required: true },  // origin + pathname (no query/hash), used to group pages
    timestamp: { type: Date, required: true },
    // click-only fields
    x: Number,
    y: Number,
    page_w: Number,
    page_h: Number,
    viewport_w: Number,
    viewport_h: Number,
    user_agent: String
  },
  { timestamps: { createdAt: 'received_at', updatedAt: false }, versionKey: false }
);

// Journey lookups and session listing
eventSchema.index({ session_id: 1, timestamp: 1 });
// Heatmap lookups
eventSchema.index({ type: 1, page: 1 });

module.exports = mongoose.model('Event', eventSchema);
