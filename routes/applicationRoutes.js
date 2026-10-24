const router = require('express').Router();
const apps = require('../controllers/applicationController');
const { protect, authorize } = require('../middleware/auth');
const v = require('../middleware/validators');

router.get('/my', protect, authorize('candidate'), v.myApplicationsRules, apps.getMyApplications);
router.patch('/:id/status', protect, authorize('employer'), v.updateStatusRules, apps.updateApplicationStatus);
router.delete('/:id', protect, authorize('candidate'), v.idRules, apps.withdrawApplication);

module.exports = router;
