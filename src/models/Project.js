const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role:   { type: String, enum: ['ADMIN', 'MEMBER'], default: 'MEMBER' }
}, { timestamps: true });

const projectSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  description: { type: String, default: null },
  creatorId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members:     [memberSchema]
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);
