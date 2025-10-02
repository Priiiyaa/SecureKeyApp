import express from 'express';
import { 
  register, 
  verifyMFACode,
  login, 
  logout, 
  sendMFACode,
  getMyProfile, 
  updateProfile, 
  updateUserPassword, 
  forgetPassword, 
  resetPassword,
  addPassword,
  getAllPasswords,
  getPasswordById,
  updatePassword,
  deletePassword,
  checkPasswordStrength,
  getPasswordsNeedingUpdate,
  searchPasswords,
  updateReminderSettings,
  checkMFAStatus,
  updateMFASessionDuration
} from '../controllers/User.js';

import { isAuthenticated } from '../middleware/auth.js';
import { requireMFA } from '../middleware/mfaCheck.js';
import { 
  validate, 
  registerValidation, 
  loginValidation, 
  updateProfileValidation, 
  changePasswordValidation,
  addPasswordValidation,
  updatePasswordValidation,
  deletePasswordValidation,
  verifyMFAValidation,
  generateOTPValidation,
  resetPasswordValidation,
  checkPasswordStrengthValidation,
  searchPasswordsValidation,
  updateReminderSettingsValidation
} from '../middleware/validate.js';
import { checkUserVerification } from '../middleware/checkUserVerification.js';

const router = express.Router();

// Authentication routes
router.post('/register', validate(registerValidation), register);
router.post('/login', validate(loginValidation), login);
router.get('/logout', logout);
router.post('/verify-mfa', isAuthenticated, validate(verifyMFAValidation), verifyMFACode);
router.post('/send-mfa-code', isAuthenticated, sendMFACode);

// MFA session management routes
router.route('/mfa/status').get(isAuthenticated, checkMFAStatus);
router.route('/mfa/duration').put(isAuthenticated, requireMFA, updateMFASessionDuration);

// User profile routes
router.get('/me', isAuthenticated, requireMFA, getMyProfile);
router.put('/updateprofile', isAuthenticated, requireMFA, checkUserVerification, validate(updateProfileValidation), updateProfile);
router.put('/updatepassword', isAuthenticated, requireMFA, checkUserVerification, validate(changePasswordValidation), updateUserPassword);

// Password reset routes
router.post('/forgotpassword', validate(generateOTPValidation), forgetPassword);
router.post('/resetpassword', validate(resetPasswordValidation), resetPassword);

// Password manager routes - all require MFA verification
router.post('/passwords', isAuthenticated, requireMFA, validate(addPasswordValidation), addPassword);
router.get('/passwords', isAuthenticated, requireMFA, getAllPasswords);
router.get('/passwords/search', isAuthenticated, requireMFA, validate(searchPasswordsValidation), searchPasswords);
router.get('/passwords/update-needed', isAuthenticated, requireMFA, getPasswordsNeedingUpdate);
router.get('/passwords/:id', isAuthenticated, requireMFA, getPasswordById);
router.put('/passwords/:id', isAuthenticated, requireMFA, checkUserVerification, validate(updatePasswordValidation), updatePassword);
router.delete('/passwords/:id', isAuthenticated, requireMFA, checkUserVerification, validate(deletePasswordValidation), deletePassword);

// Utility routes
router.post('/check-password-strength', validate(checkPasswordStrengthValidation), checkPasswordStrength);
router.put('/reminder-settings', isAuthenticated, requireMFA, validate(updateReminderSettingsValidation), updateReminderSettings);

export default router;