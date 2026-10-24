const { body, param, query, validationResult } = require('express-validator');
const { AppError } = require('./errorHandler');

const JOB_TYPES = ['full-time', 'part-time', 'internship', 'remote'];
const APP_STATUSES = ['applied', 'shortlisted', 'rejected', 'hired'];
const SORTS = ['salary', '-salary', 'createdAt', '-createdAt', 'title', '-title'];

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  const message = [...new Set(errors.array().map((e) => e.msg))].join(', ');
  next(new AppError(message, 400));
};

const requireBody = (req, res, next) => {
  if (!req.body || typeof req.body !== 'object' || Object.keys(req.body).length === 0) {
    return next(new AppError('Request body cannot be empty', 400));
  }
  next();
};

const idParam = param('id').isMongoId().withMessage('Invalid ID format');

const registerRules = [
  requireBody,
  body('name').isString().trim().notEmpty().withMessage('Name is required'),
  body('email').isString().trim().isEmail().withMessage('A valid email is required'),
  body('password').isString().withMessage('Password is required').bail()
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['candidate', 'employer']).withMessage('Role must be candidate or employer'),
  body('companyName')
    .if(body('role').equals('employer'))
    .isString().trim().notEmpty().withMessage('Company name is required for employers'),
  validate,
];

const loginRules = [
  requireBody,
  body('email').isString().trim().isEmail().withMessage('A valid email is required'),
  body('password').isString().notEmpty().withMessage('Password is required'),
  validate,
];

const jobFields = (isUpdate) => {
  const f = (name) => (isUpdate ? body(name).optional() : body(name));
  return [
    f('title').isString().trim().notEmpty().withMessage('Title is required'),
    f('description').isString().trim().notEmpty().withMessage('Description is required'),
    f('location').isString().trim().notEmpty().withMessage('Location is required'),
    f('type').isIn(JOB_TYPES).withMessage(`Type must be one of: ${JOB_TYPES.join(', ')}`),
    f('salary').isFloat({ gt: 0 }).withMessage('Salary must be a positive number').toFloat(),
    body('companyName').optional().isString().trim().notEmpty().withMessage('Company name cannot be empty'),
    body('skills').optional().isArray().withMessage('Skills must be an array').bail()
      .custom((arr) => arr.every((s) => typeof s === 'string' && s.trim() !== ''))
      .withMessage('Each skill must be a non-empty string'),
  ];
};

const createJobRules = [requireBody, ...jobFields(false), validate];
const updateJobRules = [idParam, requireBody, ...jobFields(true), validate];
const idRules = [idParam, validate];

const listJobsRules = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be an integer between 1 and 100'),
  query('minSalary').optional().isFloat({ min: 0 }).withMessage('minSalary must be a non-negative number'),
  query('type').optional().isIn(JOB_TYPES).withMessage(`type must be one of: ${JOB_TYPES.join(', ')}`),
  query('status').optional().isIn(['open', 'closed']).withMessage('status must be open or closed'),
  query('sort').optional().isIn(SORTS).withMessage(`sort must be one of: ${SORTS.join(', ')}`),
  query(['search', 'location', 'skill']).optional().isString().withMessage('search, location and skill must be single text values'),
  validate,
];

const applyRules = [
  idParam,
  requireBody,
  body('coverLetter').isString().withMessage('Cover letter is required').bail()
    .trim().notEmpty().withMessage('Cover letter is required')
    .isLength({ max: 2000 }).withMessage('Cover letter cannot exceed 2000 characters'),
  validate,
];

const statusFilterQuery = query('status').optional().isIn(APP_STATUSES)
  .withMessage(`status must be one of: ${APP_STATUSES.join(', ')}`);

const jobApplicationsRules = [idParam, statusFilterQuery, validate];
const myApplicationsRules = [statusFilterQuery, validate];

const updateStatusRules = [
  idParam,
  requireBody,
  body('status').isIn(APP_STATUSES).withMessage(`Status must be one of: ${APP_STATUSES.join(', ')}`),
  validate,
];

module.exports = {
  registerRules, loginRules, createJobRules, updateJobRules, idRules, listJobsRules,
  applyRules, jobApplicationsRules, myApplicationsRules, updateStatusRules,
};
