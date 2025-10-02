import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from 'crypto';
import zxcvbn from 'zxcvbn';



const passwordSchema = new mongoose.Schema({
  url: String,
  username: String,
  password: String,
  strengthScore: {
    type: Number,
    min: 0,
    max: 100
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  nextUpdateReminder: Date,
  notes: String,
});

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true,
    minlength: [8, "Password must be at least 8 characters"],
    select: false,
  },
  avatar: {
    public_id: String,
    url: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  passwords: [passwordSchema],
  verified: {
    type: Boolean,
    default: false,
  },
  mfaSetup: {
    type: Boolean,
    default: false,
  },
  otp: Number,
  otp_expiry: Date,
  resetPasswordOtp: Number,
  resetPasswordOtp_expiry: Date,
  
  // Settings for password reminders
  reminderFrequency: {
    type: Number,
    default: 90, // Default to 90 days
    min: 30,
    max: 365
  },

  mfaVerified: {
    type: Boolean,
    default: false
  },
  mfaSessionExpiry: {
    type: Date,
    default: null
  },
  mfaSessionDuration: {
    type: Number,
    default: 10, // Default 10 minutes
    min: 1,
    max: 60
  },
  
  // Encryption settings (storing the salt separately)
  encryptionSalt: String,
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

function checkForSequentialChars(password) {
  const lowerPass = password.toLowerCase();
  const digits = "0123456789";
  const letters = "abcdefghijklmnopqrstuvwxyz";
  
  // Check for sequences of 3 or more characters
  for (let i = 0; i < password.length - 2; i++) {
    // Check numeric sequences
    if (digits.includes(lowerPass.slice(i, i+3))) {
      return true;
    }
    // Check alphabetic sequences
    if (letters.includes(lowerPass.slice(i, i+3))) {
      return true;
    }
  }
  
  return false;
}

function checkForKeyboardPatterns(password) {
  const keyboardRows = [
    "qwertyuiop",
    "asdfghjkl",
    "zxcvbnm"
  ];
  
  const lowerPass = password.toLowerCase();
  
  // Check for keyboard patterns of length 4 or more
  for (const row of keyboardRows) {
    for (let i = 0; i <= row.length - 4; i++) {
      const pattern = row.slice(i, i + 4);
      if (lowerPass.includes(pattern)) {
        return true;
      }
    }
  }
  
  return false;
}

const getEncryptionKey = () => {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }
  return crypto.scryptSync(key, 'salt', 32);
};

// Method to encrypt a password
userSchema.methods.encryptPassword = function(password) {
    const iv = crypto.randomBytes(16); // Initialization vector
    const cipher = crypto.createCipheriv('aes-256-cbc', getEncryptionKey(), iv);
    
    let encrypted = cipher.update(password, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Store both the IV and the encrypted password
    // The IV needs to be stored to decrypt later
    return {
      iv: iv.toString('hex'),
      encryptedData: encrypted
    };
  };

// Method to decrypt a password
userSchema.methods.decryptPassword = function(encryptedPassword) {
    const iv = Buffer.from(encryptedPassword.iv, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', getEncryptionKey(), iv);
    
    let decrypted = decipher.update(encryptedPassword.encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  };

  userSchema.pre('remove', async function(next) {
    if (!this.verified) {
      next(new Error("User is not verified. Please verify your account to perform this action."));
    } else {
      next();
    }
  });



  userSchema.methods.addPassword = async function(passwordData) {
    // Encrypt the password
    const encryptedPassword = this.encryptPassword(passwordData.password);
    
    // Convert the encrypted object to a JSON string
    const encryptedPasswordString = JSON.stringify(encryptedPassword);
    
    // Calculate strength before saving using zxcvbn
    const strengthResult = zxcvbn(passwordData.password);
    
    // Map zxcvbn score (0-4) to your scoring system (0-100)
    // zxcvbn scores: 0 (worst) to 4 (best)
    const scoreMapping = {
      0: 25,  // Very weak
      1: 45,  // Weak
      2: 65,  // Medium
      3: 85,  // Strong
      4: 100  // Very strong
    };
    
    const score = scoreMapping[strengthResult.score];
    
    // Set next update reminder date
    const nextUpdateDate = new Date();
    nextUpdateDate.setDate(nextUpdateDate.getDate() + (this.reminderFrequency || 90));
    
    // Create password object with encrypted data
    const newPassword = {
      url: passwordData.url,
      username: passwordData.username,
      password: encryptedPasswordString, // Store as a JSON string
      strengthScore: score,
      lastUpdated: Date.now(),
      nextUpdateReminder: nextUpdateDate,
      notes: passwordData.notes || ''
    };
    
    // Add to passwords array
    this.passwords.push(newPassword);
    await this.save();
    
    return newPassword;
  };

  userSchema.methods.getDecryptedPassword = function(passwordId) {
    const password = this.passwords.id(passwordId);
    if (!password) return null;
    
    // Parse the encrypted password string back into an object
    const encryptedPassword = JSON.parse(password.password);
    
    // Decrypt the password
    const decryptedPassword = this.decryptPassword(encryptedPassword);
    
    // Create a copy of the password object
    const passwordCopy = { ...password.toObject() };
    
    // Replace the encrypted password with the decrypted version
    passwordCopy.password = decryptedPassword;
    
    return passwordCopy;
  };

userSchema.methods.getJWTToken = function() {
  return jwt.sign({ _id: this._id }, process.env.JWT_SECRET, {
    expiresIn: 10 * 24 * 60 * 60 * 1000,
  });
};

userSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.startMFASession = function() {
  this.mfaVerified = true;
  this.mfaSessionExpiry = new Date(Date.now() + this.mfaSessionDuration * 60 * 1000);
};

userSchema.methods.isMFASessionValid = function() {
  return this.mfaVerified && this.mfaSessionExpiry && this.mfaSessionExpiry > Date.now();
};

userSchema.methods.endMFASession = function() {
  this.mfaVerified = false;
  this.mfaSessionExpiry = null;
};

// Method to get passwords that need updating
userSchema.methods.getPasswordsNeedingUpdate = function() {
  const now = new Date();
  return this.passwords.filter(pwd => pwd.nextUpdateReminder <= now);
};

export const User = mongoose.model("User", userSchema);