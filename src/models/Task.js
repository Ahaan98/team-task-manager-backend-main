const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true },
  description: { type: String, default: null },
  dueDate:     { type: Date, required: true },
  priority:    { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'MEDIUM' },
  status:      { type: String, enum: ['TODO', 'IN_PROGRESS', 'DONE'], default: 'TODO' },
  projectId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  assignedToId:{ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  creatorId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);
