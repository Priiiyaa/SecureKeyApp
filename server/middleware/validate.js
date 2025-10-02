import { body, param, query, validationResult } from 'express-validator';

// Validation middleware
export const validate = (validations) => {
  return async (req, res, next) => {
    // Execute all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array().map(err => ({
          field: err.param,
          message: err.msg
        }))
      });
    }

    next();
  };
};

// User registration validation
export const registerValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
];

// User login validation
export const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Password is required')
];

// User profile update validation
export const updateProfileValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  
  body('avatar')
    .optional()
    .custom((value) => {
      if (!value.url) return true;
      try {
        new URL(value.url);
        return true;
      } catch(e) {
        throw new Error('Avatar URL is invalid');
      }
    })
];

// Password change validation
export const changePasswordValidation = [
  body('oldPassword')
    .notEmpty().withMessage('Current password is required'),
  
  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  
  body('confirmPassword')
    .notEmpty().withMessage('Confirm password is required')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Passwords do not match');
      }
      return true;
    })
];

// Password storage validation
export const addPasswordValidation = [
  body('url')
    .trim()
    .notEmpty().withMessage('URL is required')
    .custom((value) => {
      try {
        new URL(value);
        return true;
      } catch(e) {
        throw new Error('URL is invalid');
      }
    }),
  
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isLength({ max: 100 }).withMessage('Username cannot exceed 100 characters'),
  
  body('password')
    .notEmpty().withMessage('Password is required'),
  
  body('notes')
    .optional()
    .isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters')
];

// Update password validation
export const updatePasswordValidation = [
  param('id')
    .isMongoId().withMessage('Invalid password ID'),
  
  body('url')
    .optional()
    .trim()
    .custom((value) => {
      try {
        new URL(value);
        return true;
      } catch(e) {
        throw new Error('URL is invalid');
      }
    }),
  
  body('username')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Username cannot exceed 100 characters'),
  
  body('password')
    .optional()
    .notEmpty().withMessage('Password cannot be empty'),
  
  body('notes')
    .optional()
    .isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters')
];

// Delete password validation
export const deletePasswordValidation = [
  param('id')
    .isMongoId().withMessage('Invalid password ID')
];

// Enable MFA validation - simplified since only email is supported
export const enableMFAValidation = [
  body('method')
    .notEmpty().withMessage('MFA method is required')
    .isIn(['email']).withMessage('Invalid MFA method')
];

// Verify MFA code validation
export const verifyMFAValidation = [
  body('otp')
    .notEmpty().withMessage('MFA code is required')
    .isLength({ min: 6, max: 6 }).withMessage('MFA code must be 6 digits')
    .isNumeric().withMessage('MFA code must contain only numbers')
];

// Generate OTP validation
export const generateOTPValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail()
];

// Verify OTP validation
export const verifyOTPValidation = [
  body('otp')
    .notEmpty().withMessage('OTP is required')
    .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
    .isNumeric().withMessage('OTP must contain only numbers')
];

// Reset password validation
export const resetPasswordValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('otp')
    .notEmpty().withMessage('OTP is required')
    .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
    .isNumeric().withMessage('OTP must contain only numbers'),
  
  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
];

// Password strength check validation
export const checkPasswordStrengthValidation = [
  body('password')
    .notEmpty().withMessage('Password is required')
];

// Search passwords validation
export const searchPasswordsValidation = [
  query('query')
    .optional()
    .trim(),
  
  query('sort')
    .optional()
    .isIn(['newest', 'oldest', 'strength', 'alphabetical', ''])
    .withMessage('Invalid sort parameter'),
  
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
];

// Update reminder settings validation
export const updateReminderSettingsValidation = [
  body('reminderFrequency')
    .notEmpty().withMessage('Reminder frequency is required')
    .isInt({ min: 30, max: 365 }).withMessage('Reminder frequency must be between 30 and 365 days')
];