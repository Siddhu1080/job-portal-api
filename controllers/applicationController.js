const Application = require('../models/applicationModel');
const asyncHandler = require('../middleware/asyncHandler');
const { AppError } = require('../middleware/errorHandler');

const TRANSITIONS = {
  applied: ['shortlisted', 'rejected'],
  shortlisted: ['hired', 'rejected'],
  rejected: [],
  hired: [],
};

exports.getMyApplications = asyncHandler(async (req, res) => {
  const filter = { candidate: req.user._id };
  if (req.query.status) filter.status = req.query.status;

  const applications = await Application.find(filter)
    .sort('-createdAt')
    .populate('job', 'title companyName location type salary skills status');

  res.status(200).json({ success: true, count: applications.length, data: applications });
});

exports.updateApplicationStatus = asyncHandler(async (req, res) => {
  const application = await Application.findById(req.params.id).populate('job');
  if (!application || !application.job) throw new AppError('Application not found', 404);

  if (application.job.postedBy.toString() !== req.user.id) {
    throw new AppError('You can only update applications for your own jobs', 403);
  }

  const from = application.status;
  const to = req.body.status;
  if (!TRANSITIONS[from].includes(to)) {
    throw new AppError(`An application cannot move from ${from} to ${to}`, 400);
  }

  application.status = to;
  await application.save();
  res.status(200).json({ success: true, data: application });
});

exports.withdrawApplication = asyncHandler(async (req, res) => {
  const application = await Application.findById(req.params.id);
  if (!application) throw new AppError('Application not found', 404);

  if (application.candidate.toString() !== req.user.id) {
    throw new AppError('You can only withdraw your own applications', 403);
  }
  if (application.status !== 'applied') {
    throw new AppError(`Only applications with status "applied" can be withdrawn (current status: ${application.status})`, 400);
  }

  await application.deleteOne();
  res.status(200).json({ success: true, message: 'Application withdrawn' });
});
