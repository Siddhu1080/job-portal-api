const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Title is required'], trim: true },
    description: { type: String, required: [true, 'Description is required'], trim: true },
    companyName: { type: String, required: [true, 'Company name is required'], trim: true },
    location: { type: String, required: [true, 'Location is required'], trim: true },
    type: {
      type: String,
      enum: { values: ['full-time', 'part-time', 'internship', 'remote'], message: 'Invalid job type' },
      required: [true, 'Job type is required'],
    },
    salary: {
      type: Number,
      required: [true, 'Salary is required'],
      validate: { validator: (v) => v > 0, message: 'Salary must be a positive number' },
    },
    skills: { type: [String], default: [] },
    status: { type: String, enum: ['open', 'closed'], default: 'open' },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

jobSchema.index({ postedBy: 1 });
jobSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Job', jobSchema);
