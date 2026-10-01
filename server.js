'use strict';

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const helmet = require('helmet');
const multer = require('multer');
const { engine } = require('express-handlebars');
const { body, validationResult } = require('express-validator');
const helpers = require('./helpers');

const app = express();
const PORT = process.env.PORT || 3000;

const UPLOAD_DIR = path.join(__dirname, 'uploads');
const DATA_FILE = path.join(__dirname, 'data', 'complaints.json');
const MAX_FILES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const IMAGE_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
};

/* ---------- Simple JSON-file persistence ---------- */
let complaints = [];
try {
  complaints = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
} catch (_) {
  complaints = [];
}
const saveComplaints = () =>
  fs.writeFileSync(DATA_FILE, JSON.stringify(complaints, null, 2));

/* ---------- Security headers (helmet) ---------- */
// Defaults already give a strict CSP (scripts/styles/images only from 'self').
app.use(helmet());

/* ---------- View engine ---------- */
app.engine('hbs', engine({ extname: '.hbs', defaultLayout: 'main', helpers }));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

/* ---------- Static files ---------- */
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOAD_DIR, { index: false }));
app.use(express.urlencoded({ extended: false }));

/* ---------- File upload (multer) ---------- */
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    // Random server-chosen name; extension derived from the MIME type, not user input
    filename: (req, file, cb) =>
      cb(null, crypto.randomBytes(16).toString('hex') + IMAGE_TYPES[file.mimetype]),
  }),
  limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES },
  fileFilter: (req, file, cb) => {
    if (IMAGE_TYPES[file.mimetype]) return cb(null, true);
    const err = new Error('Only JPG, PNG, GIF or WebP images are allowed.');
    err.code = 'BAD_FILE_TYPE';
    cb(err);
  },
}).array('images', MAX_FILES);

function handleUpload(req, res, next) {
  upload(req, res, (err) => {
    if (!err) return next();
    let message = err.message;
    if (err.code === 'LIMIT_FILE_SIZE') message = 'Each image must be 5 MB or smaller.';
    if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE')
      message = `You can upload up to ${MAX_FILES} images.`;
    req.uploadError = message;
    next();
  });
}

/* ---------- Validation rules (express-validator) ---------- */
const complaintRules = [
  body('fullName')
    .trim()
    .notEmpty().withMessage('Full name is required.').bail()
    .isLength({ min: 2, max: 80 }).withMessage('Name must be 2–80 characters.').bail()
    .matches(/^[\p{L}][\p{L}\p{M}'’.\- ]*$/u).withMessage('Name contains invalid characters.'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email address is required.').bail()
    .isEmail().withMessage('Enter a valid email address.').bail()
    .normalizeEmail({ gmail_remove_dots: false }),
  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required.').bail()
    .matches(/^\+?[0-9 ()\-.]{10,20}$/).withMessage('Enter a valid phone number.').bail()
    .custom((v) => v.replace(/\D/g, '').length >= 10 && v.replace(/\D/g, '').length <= 15)
    .withMessage('Phone number must contain 10–15 digits.'),
  body('vehicleMake')
    .trim()
    .notEmpty().withMessage('Vehicle make is required.').bail()
    .isLength({ min: 2, max: 40 }).withMessage('Make must be 2–40 characters.'),
  body('vehicleModel')
    .trim()
    .notEmpty().withMessage('Vehicle model is required.').bail()
    .isLength({ min: 1, max: 40 }).withMessage('Model must be 1–40 characters.'),
  body('vin')
    .trim()
    .toUpperCase()
    .notEmpty().withMessage('VIN is required.').bail()
    .matches(/^[A-HJ-NPR-Z0-9]{17}$/)
    .withMessage('VIN must be 17 characters (letters and digits, no I, O or Q).'),
  body('subject')
    .trim()
    .notEmpty().withMessage('Subject is required.').bail()
    .isLength({ min: 5, max: 100 }).withMessage('Subject must be 5–100 characters.'),
  body('description')
    .trim()
    .notEmpty().withMessage('Please describe the problem.').bail()
    .isLength({ min: 20, max: 2000 })
    .withMessage('Description must be 20–2000 characters.'),
];

/* ---------- Routes ---------- */
app.get('/', (req, res) => {
  res.render('index', { title: 'Submit a complaint', values: {}, errors: {} });
});

app.post('/complaints', handleUpload, complaintRules, (req, res) => {
  const result = validationResult(req);
  const errors = {};
  result.array().forEach((e) => {
    if (!errors[e.path]) errors[e.path] = e.msg;
  });
  if (req.uploadError) errors.images = req.uploadError;

  if (Object.keys(errors).length) {
    // Clean up any files that were saved before validation failed
    (req.files || []).forEach((f) => fs.unlink(f.path, () => {}));
    return res.status(422).render('index', {
      title: 'Submit a complaint',
      values: req.body,
      errors,
      hasErrors: true,
    });
  }

  const complaint = {
    id: crypto.randomBytes(6).toString('hex'),
    submittedAt: new Date().toISOString(),
    fullName: req.body.fullName,
    email: req.body.email,
    phone: req.body.phone,
    vehicleMake: req.body.vehicleMake,
    vehicleModel: req.body.vehicleModel,
    vin: req.body.vin,
    subject: req.body.subject,
    description: req.body.description,
    images: (req.files || []).map((f) => ({
      url: `/uploads/${f.filename}`,
      originalName: f.originalname,
      size: f.size,
    })),
  };
  complaints.push(complaint);
  saveComplaints();

  // Post/Redirect/Get: prevents duplicate submissions on refresh
  res.redirect(303, `/complaints/${complaint.id}`);
});

app.get('/complaints/:id', (req, res, next) => {
  const complaint = complaints.find((c) => c.id === req.params.id);
  if (!complaint) return next();
  res.render('complaint', { title: `Complaint #${complaint.id}`, complaint });
});

/* ---------- 404 & error handlers ---------- */
app.use((req, res) => {
  res.status(404).render('error', { title: 'Not found', message: 'We couldn’t find that page.' });
});
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error(err);
  res.status(500).render('error', { title: 'Server error', message: 'Something went wrong on our end. Please try again.' });
});

app.listen(PORT, () => console.log(`Right Drive Automotive running at http://localhost:${PORT}`));
