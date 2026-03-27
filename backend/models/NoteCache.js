const mongoose = require("mongoose");

const noteCacheSchema = new mongoose.Schema({
    subject: { type: String, required: true },
    topic: { type: String, required: true },
    marks: { type: Number, required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

noteCacheSchema.index({ subject: 1, topic: 1, marks: 1 });

const NoteCache = mongoose.model("NoteCache", noteCacheSchema);

module.exports = NoteCache;