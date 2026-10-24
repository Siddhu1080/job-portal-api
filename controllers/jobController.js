const Job = require('../models/jobModel');
const Application = require('../models/applicationModel');
const asyncHandler = require('../middleware/asyncHandler');
const { AppError } = require('../middleware/errorHandler');

const STATUSES = ['applied', 'shortlisted', 'rejected', 'hired'];
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const cleanSkills = (arr) => arr.map((s) => s.trim()).filter(Boolean);

const findJobOr404 = async (id) => {
  const job = await Job.findById(id);
  if (!job) throw new AppError('Job not found', 404);
  return job;
};

const assertOwner = (job, user, message) => {
  if (job.postedBy.toString() !== user.id) throw new AppError(message, 403);
};

exports.createJob = asyncHandler(async (req, res) => {
  const { title, description, companyName, location, type, salary, skills } = req.body;
  const job = await Job.create({
    title,
    description,
    companyName: companyName || req.user.companyName,
    location,
    type,
    salary,
    skills: skills ? cleanSkills(skills) : [],
    postedBy: req.user._id,
  });
  res.status(201).json({ success: true, data: job });
});

exports.getJobs = asyncHandler(async (req, res) => {
  const { search, location, type, skill, minSalary, status, sort } = req.query;
  const page = parseInt(req.query.page || '1', 10);
  const limit = parseInt(req.query.limit || '10', 10);

  const filter = {};
  if (search) {
    const rx = { $regex: escapeRegex(search.trim()), $options: 'i' };
    filter.$or = [{ title: rx }, { companyName: rx }];
  }
  if (location) filter.location = { $regex: escapeRegex(location.trim()), $options: 'i' };
  if (type) filter.type = type;
  if (status) filter.status = status;
  if (skill) filter.skills = { $regex: `^${escapeRegex(skill.trim())}$`, $options: 'i' };
  if (minSalary !== undefined) filter.salary = { $gte: Number(minSalary) };

  const total = await Job.countDocuments(filter);
  const jobs = await Job.find(filter)
    .sort(`${sort || '-createdAt'} _id`)
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('postedBy', 'name companyName');

  res.status(200).json({
    success: true,
    total,
    page,
    pages: Math.ceil(total / limit),
    count: jobs.length,
    data: jobs,
  });
});

exports.getJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id).populate('postedBy', 'name companyName');
  if (!job) throw new AppError('Job not found', 404);
  res.status(200).json({ success: true, data: job });
});

exports.updateJob = asyncHandler(async (req, res) => {
  const job = await findJobOr404(req.params.id);
  assertOwner(job, req.user, 'You can only update your own jobs');

  const fields = ['title', 'description', 'companyName', 'location', 'type', 'salary', 'skills'];
  const provided = fields.filter((f) => req.body[f] !== undefined);
  if (provided.length === 0) throw new AppError('No valid fields provided to update', 400);

  provided.forEach((f) => {
    job[f] = f === 'skills' ? cleanSkills(req.body.skills) : req.body[f];
  });
  await job.save();

  res.status(200).json({ success: true, data: job });
});

exports.closeJob = asyncHandler(async (req, res) => {
  const job = await findJobOr404(req.params.id);
  assertOwner(job, req.user, 'You can only close your own jobs');
  if (job.status === 'closed') throw new AppError('Job is already closed', 400);

  job.status = 'closed';
  await job.save();
  res.status(200).json({ success: true, data: job });
});

exports.deleteJob = asyncHandler(async (req, res) => {
  const job = await findJobOr404(req.params.id);
  assertOwner(job, req.user, 'You can only delete your own jobs');

  const { deletedCount } = await Application.deleteMany({ job: job._id });
  await job.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Job and its applications deleted',
    deletedApplications: deletedCount,
  });
});

exports.getJobStats = asyncHandler(async (req, res) => {
  const job = await findJobOr404(req.params.id);
  assertOwner(job, req.user, 'You can only view statistics of your own jobs');

  const rows = await Application.aggregate([
    { $match: { job: job._id } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  rows.forEach((r) => { byStatus[r._id] = r.count; });
  const total = Object.values(byStatus).reduce((a, b) => a + b, 0);

  res.status(200).json({
    success: true,
    data: { job: job._id, title: job.title, jobStatus: job.status, total, byStatus },
  });
});

exports.applyToJob = asyncHandler(async (req, res) => {
  if (req.user.role !== 'candidate') throw new AppError('Only candidates can apply to jobs', 403);

  const job = await findJobOr404(req.params.id);
  if (job.status !== 'open') throw new AppError('This job is closed and no longer accepts applications', 409);

  const existing = await Application.findOne({ job: job._id, candidate: req.user._id });
  if (existing) throw new AppError('You have already applied to this job', 409);

  const application = await Application.create({
    job: job._id,
    candidate: req.user._id,
    coverLetter: req.body.coverLetter,
  });
  res.status(201).json({ success: true, data: application });
});

exports.getJobApplications = asyncHandler(async (req, res) => {
  const job = await findJobOr404(req.params.id);
  assertOwner(job, req.user, 'You can only view applications of your own jobs');

  const filter = { job: job._id };
  if (req.query.status) filter.status = req.query.status;

  const applications = await Application.find(filter)
    .sort('-createdAt')
    .populate('candidate', 'name email');

  res.status(200).json({ success: true, count: applications.length, data: applications });
});
