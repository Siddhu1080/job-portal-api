const router = require('express').Router();
const jobs = require('../controllers/jobController');
const { protect, authorize } = require('../middleware/auth');
const v = require('../middleware/validators');

router.route('/')
  .post(protect, authorize('employer'), v.createJobRules, jobs.createJob)
  .get(v.listJobsRules, jobs.getJobs);

router.route('/:id')
  .get(v.idRules, jobs.getJob)
  .put(protect, authorize('employer'), v.updateJobRules, jobs.updateJob)
  .delete(protect, authorize('employer'), v.idRules, jobs.deleteJob);

router.patch('/:id/close', protect, authorize('employer'), v.idRules, jobs.closeJob);
router.get('/:id/stats', protect, authorize('employer'), v.idRules, jobs.getJobStats);
router.post('/:id/apply', protect, authorize('candidate'), v.applyRules, jobs.applyToJob);
router.get('/:id/applications', protect, authorize('employer'), v.jobApplicationsRules, jobs.getJobApplications);

module.exports = router;
