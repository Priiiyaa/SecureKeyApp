import { User } from '../models/users.js'
import { sendMail } from '../utils/sendMail.js';
import { sendToken } from '../utils/sendToken.js';
import cloudinary from "cloudinary";
import fs from "fs";
import zxcvbn from 'zxcvbn';




// In your auth controller
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    
    // Check if user already exists
    let user = await User.findOne({ email });
    
    if (user) {
      return res.status(400).json({ success: false, message: "User already exists" });
    }


    
    // Create user with basic info
    user = await User.create({
      name,
      email,
      password,
    });


    
    // Handle avatar upload if provided
    if (req.files && req.files.avatar) {
      const avatarPath = req.files.avatar.tempFilePath;
      
      const mycloud = await cloudinary.v2.uploader.upload(avatarPath, {
        folder: "passwordManager",
      });
      
      user.avatar = {
        public_id: mycloud.public_id,
        url: mycloud.secure_url,
      };
      
      // Clean up temp file
      fs.rmSync("./tmp", { recursive: true });
      
      await user.save();
    }
    
    // Generate OTP for MFA setup
    const otp = Math.floor(100000 + Math.random() * 900000); // 6-digit OTP
    
    // Save OTP to user
    user.otp = otp;
    user.otp_expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry
    
    await user.save();
    
    // Send OTP via email
    const htmlMessage = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #f0f0f0; border-radius: 10px;">
        <h2 style="color: #333;">Account Verification Required</h2>
        <p>Thank you for registering! To complete your account setup and access your password manager, please verify your account with the following code:</p>
        <div style="background-color: #f8f8f8; padding: 10px; border-radius: 5px; text-align: center;">
          <p style="font-size: 24px; font-weight: bold; color: #555;">Your Verification Code: <span style="color: #007bff;">${otp}</span></p>
        </div>
        <p>This code is valid for 10 minutes. If you did not create this account, please ignore this email.</p>
        <hr style="border: 1px solid #e0e0e0; margin: 20px 0;">
        <p style="font-size: 14px; color: #777;">Multi-Factor Authentication is required for all accounts to ensure the security of your stored passwords.</p>
      </div>
    `;
    
    await sendMail(user.email, "Account Verification Code", htmlMessage);
    
    sendToken(
      res, 
      user, 
      201, 
      "Registration successful! Please verify your account with the code sent to your email.", 
      { requireMFA: true }
    );
    
      
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const verifyMFACode = async (req, res) => {
  try {
    const otp = Number(req.body.otp);
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.otp !== otp || user.otp_expiry < Date.now()) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid verification code or code has expired" });
    }

    // First-time verification sets the verified flag
    if (!user.verified) {
      user.verified = true;
    }

    // Start a new MFA session
    user.startMFASession();
    user.otp = null;
    user.otp_expiry = null;

    await user.save();

    sendToken(res, user, 200, "MFA verification successful", {
      mfaSessionExpiry: user.mfaSessionExpiry
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// In your auth controller
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user and include password field
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid email and/or password" });
    }
    
    // Check password
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid email and/or password" });
    }
    
    // Generate token
    const token = user.getJWTToken();
    
    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    };
    
    // If not verified or MFA session expired, require MFA
    if (!user.verified || !user.isMFASessionValid()) {
      // End any existing MFA session
      user.endMFASession();
      await user.save();
      
      // Send the token but indicate MFA is required
      sendToken(
        res, 
        user, 
        200, 
        user.verified ? "Login successful! MFA required." : "Registration successful! MFA required.", 
        { requireMFA: true }
      );
      
    } else {
      // Normal login response with valid MFA session
      res.status(200)
        .cookie("secureKey-token", token, options)
        .json({ 
          success: true, 
          message: "Login successful",
          user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            verified: user.verified,
            mfaVerified: user.mfaVerified,
            mfaSessionExpiry: user.mfaSessionExpiry,
            mfaSessionDuration: user.mfaSessionDuration
          }
        });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

  // Replace enableMFA with sendMFACode since MFA is now mandatory
  export const sendMFACode = async (req, res) => {
    try {
      const user = await User.findById(req.user._id);
      
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      
      // Generate OTP
      const otp = Math.floor(100000 + Math.random() * 900000); // 6-digit OTP
      
      // Save OTP to user
      user.otp = otp;
      user.otp_expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry
      
      // Set MFA as required by ending any existing MFA session
      user.mfaVerified = false;  // Mark MFA as not verified
      user.mfaSessionExpiry = null;  // Clear any existing MFA session
      
      await user.save();
      
      // Send OTP via email
      const htmlMessage = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #f0f0f0; border-radius: 10px;">
          <h2 style="color: #333;">Multi-Factor Authentication</h2>
          <p>To complete your login, please use the following verification code:</p>
          <div style="background-color: #f8f8f8; padding: 10px; border-radius: 5px; text-align: center;">
            <p style="font-size: 24px; font-weight: bold; color: #555;">Your MFA Code: <span style="color: #007bff;">${otp}</span></p>
          </div>
          <p>This code is valid for 10 minutes. If you did not request this code, please secure your account immediately.</p>
          <hr style="border: 1px solid #e0e0e0; margin: 20px 0;">
          <p style="font-size: 14px; color: #777;">Multi-Factor Authentication is required for all accounts to ensure the security of your stored passwords.</p>
        </div>
      `;
      
      await sendMail(user.email, "MFA Verification Code", htmlMessage);
      
      res.status(200).json({
        success: true,
        message: "MFA verification code sent to your email.",
        requireMFA: true // Add this to explicitly indicate MFA is required
      });
      
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  export const updateMFASessionDuration = async (req, res) => {
    try {
      const { duration } = req.body;
      const user = await User.findById(req.user._id);
      
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      
      // Validate duration (1-60 minutes)
      if (duration < 1 || duration > 60) {
        return res.status(400).json({ 
          success: false, 
          message: "MFA session duration must be between 1 and 60 minutes" 
        });
      }
      
      user.mfaSessionDuration = duration;
      
      // Update current session expiry if active
      if (user.mfaVerified && user.mfaSessionExpiry) {
        const timeElapsed = Date.now() - (new Date(user.mfaSessionExpiry) - (user.mfaSessionDuration * 60 * 1000));
        user.mfaSessionExpiry = new Date(Date.now() + user.mfaSessionDuration * 60 * 1000 - timeElapsed);
      }
      
      await user.save();
      
      res.status(200).json({
        success: true,
        message: "MFA session duration updated successfully",
        mfaSessionDuration: user.mfaSessionDuration,
        mfaSessionExpiry: user.mfaSessionExpiry
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  export const requireMFA = async (req, res, next) => {
    try {
      const user = await User.findById(req.user._id);
      
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      
      // Check if MFA is verified and session is valid
      if (!user.isMFASessionValid()) {
        return res.status(403).json({ 
          success: false, 
          message: "MFA verification required", 
          requireMFA: true 
        });
      }
      
      next();
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  export const logout = async (req, res) => {
    try {
      // Get user and end MFA session
      if (req.user && req.user._id) {
        const user = await User.findById(req.user._id);
        if (user) {
          user.endMFASession();
          await user.save();
        }
      }
  
      res.status(200).cookie("secureKey-token", "", {
        maxAge: 0,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
      })
      .json({ success: true, message: "Logged out Successfully" });
  
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  };

  export const checkMFAStatus = async (req, res) => {
    try {
      const user = await User.findById(req.user._id);
      
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      
      const mfaRequired = !user.isMFASessionValid();
      
      res.status(200).json({
        success: true,
        mfaRequired,
        mfaSessionExpiry: user.mfaSessionExpiry,
        mfaSessionDuration: user.mfaSessionDuration
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

export const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    sendToken(res, user, 200, `Welcome back! ${user.name}`);
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
      const user = await User.findById(req.user._id);

      const { name } = req.body;

      if (name) user.name = name;

      // Make avatar upload optional
      if (req.files && req.files.avatar) {
          const avatarPath = req.files.avatar.tempFilePath;

          if (user.avatar?.public_id) {
              await cloudinary.v2.uploader.destroy(user.avatar.public_id);
          }

          const mycloud = await cloudinary.v2.uploader.upload(avatarPath, {
              folder: "passwordManager",
          });

          user.avatar = {
              public_id: mycloud.public_id,
              url: mycloud.secure_url,
          };

          fs.rmSync("./tmp", { recursive: true });
      } else if (req.body.avatar && req.body.avatar.startsWith("http")) {
          // For avatar URLs provided directly
          if (user.avatar?.public_id) {
              await cloudinary.v2.uploader.destroy(user.avatar.public_id);
          }

          user.avatar = {
              public_id: null, 
              url: req.body.avatar,
          };
      }
      // If no avatar is provided, keep the existing one

      await user.save();

      res.status(200).json({ 
          success: true, 
          message: "Profile updated successfully",
          user: {
              _id: user._id,
              name: user.name,
              email: user.email,
              avatar: user.avatar
          }
      });
  } catch (e) {
      console.error(e);
      res.status(500).json({ success: false, message: e.message });
  }
};

export const updateUserPassword = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select("+password");

        const { oldPassword, newPassword } = req.body;

        if(!oldPassword || !newPassword){
            return res
               .status(400)
               .json({ success: false, message: "Please enter both Old Password and New Password" });
        }

        const isMatch = await user.comparePassword(oldPassword);

        if (!isMatch) {
            return res
                .status(400)
                .json({ success: false, message: "Invalid Old Password" });
        }

        user.password = newPassword;

        await user.save();

        res.status(200).json({ success: true, message: "Password updated successfully" });

    } catch (e) {
        res.status(500).json({ success: false, message: e.message })
    }
};

export const forgetPassword = async (req, res) => {
    try {
        const { email} = req.body;


        const user = await User.findOne({ email: email });

        if (!user) {
            return res
               .status(404)
               .json({ success: false, message: "Invalid email" });
        }

        const otp = Math.floor(Math.random() * 1000000);

        
        user.resetPasswordOtp = otp
        user.resetPasswordOtp_expiry= Date.now() + 10 * 60 * 1000;

        await user.save();

        const htmlMessage = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #f0f0f0; border-radius: 10px;">
            <h2 style="color: #333;">Dear ${user.name},</h2>
            <p>We received a request to reset the password for your TaskTrack account. To proceed with resetting your password, please use the following One-Time Password (OTP):</p>
            <div style="background-color: #f8f8f8; padding: 10px; border-radius: 5px; text-align: center;">
                <p style="font-size: 24px; font-weight: bold; color: #555;">Your OTP Code: <span style="color: #007bff;">${otp}</span></p>
            </div>
            <p>This code is valid for the next <strong>5 minutes</strong>. Please enter it in the app to reset your password.</p>
            <p>If you did not request a password reset, you can safely ignore this email—your account will remain secure.</p>
            <hr style="border: 1px solid #e0e0e0; margin: 20px 0;">
            <p style="font-size: 14px; color: #777;">Why am I receiving this email?</p>
            <p style="font-size: 14px; color: #777;">You received this email because someone requested a password reset for an account associated with this email address on TaskTrack. If this was not you, please ignore this email.</p>
            <p style="font-size: 14px; color: #777;">Thank you for being a part of TaskTrack.</p>
            <p style="font-size: 14px; color: #777;">Best regards,<br>The TaskTrack Team</p>
        </div>`;

        await sendMail(email, "Request for Reseting Password", htmlMessage);

        

        res.status(200).json({ success: true, message: `OTP sent to ${email}` });

    } catch (e) {
        res.status(500).json({ success: false, message: e.message })
    }
};

export const resetPassword = async (req, res) => {
    try {
        const { otp, newPassword } = req.body;

        const user = await User.findOne({ resetPasswordOtp: otp, resetPasswordOtp_expiry: {$gt: Date.now()}}).select("+password");

        if (!user) {
            return res
               .status(404)
               .json({ success: false, message: "Otp Invalid or has been expired" });
        }

        
        user.password =  newPassword;
        user.resetPasswordOtp = null;
        user.resetPasswordOtp_expiry= null;


        await user.save();

        res.status(200).json({ success: true, message: "Password Changed Successfully" });

    } catch (e) {
        res.status(500).json({ success: false, message: e.message })
    }
};

// Create a new stored password
export const addPassword = async (req, res) => {
    try {
      const user = await User.findById(req.user._id);
      
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      
      const { url, username, password, notes } = req.body;

      
      const passwordData = {
        url,
        username,
        password,
        notes
      };
      
      const savedPassword = await user.addPassword(passwordData);
      
      res.status(201).json({ 
        success: true, 
        message: "Password saved successfully", 
        password: {
          _id: savedPassword._id,
          url: savedPassword.url,
          username: savedPassword.username,
          notes: savedPassword.notes,
          strengthScore: savedPassword.strengthScore,
          lastUpdated: savedPassword.lastUpdated,
          nextUpdateReminder: savedPassword.nextUpdateReminder
        }
      });
      
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };
  
  // Get all stored passwords
  export const getAllPasswords = async (req, res) => {
    try {
      const user = await User.findById(req.user._id);
      
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      
      // Return passwords without exposing the actual password values
      const passwords = user.passwords.map(pwd => ({
        _id: pwd._id,
        url: pwd.url,
        username: pwd.username,
        strengthScore: pwd.strengthScore,
        lastUpdated: pwd.lastUpdated,
        nextUpdateReminder: pwd.nextUpdateReminder,
        notes: pwd.notes
      }));
      
      res.status(200).json({ 
        success: true, 
        count: passwords.length,
        passwords
      });
      
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };
  
  // Get a single password by ID
  export const getPasswordById = async (req, res) => {
    try {
      const user = await User.findById(req.user._id);
      
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      
      const password = user.passwords.id(req.params.id);
      
      if (!password) {
        return res.status(404).json({ success: false, message: "Password not found" });
      }
      
      // Get decrypted password
      const decryptedPassword = user.getDecryptedPassword(req.params.id);
      
      res.status(200).json({ 
        success: true, 
        password: {
          _id: decryptedPassword._id,
          url: decryptedPassword.url,
          username: decryptedPassword.username,
          password: decryptedPassword.password, // This is now decrypted
          strengthScore: decryptedPassword.strengthScore,
          lastUpdated: decryptedPassword.lastUpdated,
          nextUpdateReminder: decryptedPassword.nextUpdateReminder,
          notes: decryptedPassword.notes
        }
      });
      
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };
  
  // Update a password
  export const updatePassword = async (req, res) => {
    try {
      const user = await User.findById(req.user._id);
      
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      
      const password = user.passwords.id(req.params.id);
      
      if (!password) {
        return res.status(404).json({ success: false, message: "Password not found" });
      }
      
      const { url, username, password: newPassword, notes } = req.body;
      
      // Update only provided fields
      if (url) password.url = url;
      if (username) password.username = username;
      
      if (newPassword) {
        // Check password strength using zxcvbn
        const strengthResult = zxcvbn(newPassword);
        
        // Map zxcvbn score to your scoring system
        const scoreMapping = {
          0: 25,  // Very weak
          1: 45,  // Weak
          2: 65,  // Medium
          3: 85,  // Strong
          4: 100  // Very strong
        };
        
        const score = scoreMapping[strengthResult.score];
        
        // Set the strength score
        password.strengthScore = score;
        
        // Encrypt the new password
        const encryptedPassword = user.encryptPassword(newPassword);
        
        // Convert the encrypted object to a JSON string
        const encryptedPasswordString = JSON.stringify(encryptedPassword);
        
        // Save the encrypted password string
        password.password = encryptedPasswordString;
      }
      
      if (notes !== undefined) password.notes = notes;
      
      // Update timestamp
      password.lastUpdated = Date.now();
      
      // Reset reminder date based on user preference
      const nextUpdateDate = new Date();
      nextUpdateDate.setDate(nextUpdateDate.getDate() + (user.reminderFrequency || 90));
      password.nextUpdateReminder = nextUpdateDate;
      
      await user.save();
      
      res.status(200).json({ 
        success: true, 
        message: "Password updated successfully",
        password: {
          _id: password._id,
          url: password.url,
          username: password.username,
          strengthScore: password.strengthScore,
          lastUpdated: password.lastUpdated,
          nextUpdateReminder: password.nextUpdateReminder,
          notes: password.notes
        }
      });
      
    } catch (error) {
      console.error("Update password error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  };
  
  // Delete a password
  export const deletePassword = async (req, res) => {
    try {
      const user = await User.findById(req.user._id);
  
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
  
      // Check if user is verified
      if (!user.verified) {
        return res.status(403).json({ 
          success: false, 
          message: "User is not verified. Please verify your account to perform this action." 
        });
      }
  
      const passwordIndex = user.passwords.findIndex(
        pwd => pwd._id.toString() === req.params.id
      );
  
      if (passwordIndex === -1) {
        return res.status(404).json({ success: false, message: "Password not found" });
      }
  
      // Remove password from array
      user.passwords.splice(passwordIndex, 1);
      await user.save();
  
      res.status(200).json({ 
        success: true, 
        message: "Password deleted successfully"
      });
  
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };
  
// Helper function to generate a strong random password
const generateStrongPassword = (length = 16) => {
  const uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
  const numberChars = '0123456789';
  const specialChars = '!@#$%^&*()-_=+[]{}|;:,.<>?';
  
  // Ensure at least one character from each category
  let password = '';
  password += uppercaseChars.charAt(Math.floor(Math.random() * uppercaseChars.length));
  password += lowercaseChars.charAt(Math.floor(Math.random() * lowercaseChars.length));
  password += numberChars.charAt(Math.floor(Math.random() * numberChars.length));
  password += specialChars.charAt(Math.floor(Math.random() * specialChars.length));
  
  // Fill the rest of the password length with random characters from all categories
  const allChars = uppercaseChars + lowercaseChars + numberChars + specialChars;
  for (let i = 4; i < length; i++) {
    password += allChars.charAt(Math.floor(Math.random() * allChars.length));
  }
  
  // Shuffle the password characters to make it truly random
  return password.split('').sort(() => 0.5 - Math.random()).join('');
};

export const checkPasswordStrength = async (req, res) => {
  try {
    const { password } = req.body;

    // Debug: Log the password being checked
    console.log("Password being checked:", password);

    // Calculate password strength using zxcvbn
    const strengthResult = zxcvbn(password);

    // Debug: Log the strength result
    console.log("Strength Result:", strengthResult);

    // Map zxcvbn score to your scoring system
    const scoreMapping = {
      0: 25,  // Very weak
      1: 45,  // Weak
      2: 65,  // Medium
      3: 85,  // Strong
      4: 100  // Very strong
    };
    
    const strengthScore = scoreMapping[strengthResult.score];

    // Debug: Log the calculated strength score
    console.log("Calculated Strength Score:", strengthScore);

    // Determine strength category
    let strengthCategory = "Weak";
    if (strengthScore >= 80) {
      strengthCategory = "Very Strong";
    } else if (strengthScore >= 60) {
      strengthCategory = "Strong";
    } else if (strengthScore >= 40) {
      strengthCategory = "Medium";
    }

    // Debug: Log the strength category
    console.log("Strength Category:", strengthCategory);

    // Generate recommendation based on zxcvbn feedback
    let recommendation = null;
    if (strengthScore < 60) {
      recommendation = {
        warning: strengthResult.feedback.warning,
        suggestions: strengthResult.feedback.suggestions
      };
    }

    // Generate a strong random password recommendation
    const recommendedPassword = generateStrongPassword();
    
    // Check the strength of our recommended password to ensure it's strong
    const recommendedPasswordStrength = zxcvbn(recommendedPassword);
    
    // Debug: Log the recommendation
    console.log("Recommendation:", recommendation);
    console.log("Recommended Password:", recommendedPassword);

    res.status(200).json({
      success: true,
      strengthScore,
      strengthCategory,
      recommendation,
      // Include the recommended password
      recommendedPassword: {
        value: recommendedPassword,
        score: scoreMapping[recommendedPasswordStrength.score],
        category: recommendedPasswordStrength.score >= 3 ? "Very Strong" : "Strong"
      },
      // You can optionally include more details from zxcvbn
      details: {
        crackTimesSeconds: strengthResult.crack_times_seconds,
        crackTimesDisplay: strengthResult.crack_times_display,
        score: strengthResult.score,
        feedback: strengthResult.feedback
      }
    });

  } catch (error) {
    console.error("Error in checkPasswordStrength:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
  
  
  // Get passwords that need updating
  export const getPasswordsNeedingUpdate = async (req, res) => {
    try {
      const user = await User.findById(req.user._id);
      
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      
      const passwordsNeedingUpdate = user.getPasswordsNeedingUpdate();
      
      // Return without actual password values
      const passwordsInfo = passwordsNeedingUpdate.map(pwd => ({
        _id: pwd._id,
        url: pwd.url,
        username: pwd.username,
        strengthScore: pwd.strengthScore,
        lastUpdated: pwd.lastUpdated,
        nextUpdateReminder: pwd.nextUpdateReminder
      }));
      
      res.status(200).json({
        success: true,
        count: passwordsInfo.length,
        passwords: passwordsInfo
      });
      
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };
  
  // Search passwords
  export const searchPasswords = async (req, res) => {
    try {
      const user = await User.findById(req.user._id);
      
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      
      const { query, category, sort } = req.query;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      
      // Filter passwords based on search query and category
      let filteredPasswords = [...user.passwords];
      
      if (query) {
        const searchRegex = new RegExp(query, 'i');
        filteredPasswords = filteredPasswords.filter(pwd => 
          searchRegex.test(pwd.url) || 
          searchRegex.test(pwd.username) || 
          searchRegex.test(pwd.notes)
        );
      }
      
      if (category) {
        filteredPasswords = filteredPasswords.filter(pwd => pwd.category === category);
      }
      
      // Sort passwords
      if (sort) {
        switch (sort) {
          case 'newest':
            filteredPasswords.sort((a, b) => b.lastUpdated - a.lastUpdated);
            break;
          case 'oldest':
            filteredPasswords.sort((a, b) => a.lastUpdated - b.lastUpdated);
            break;
          case 'strength':
            filteredPasswords.sort((a, b) => b.strengthScore - a.strengthScore);
            break;
          case 'alphabetical':
            filteredPasswords.sort((a, b) => a.url.localeCompare(b.url));
            break;
          default:
            break;
        }
      }
      
      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      const paginatedPasswords = filteredPasswords.slice(startIndex, endIndex);
      
      // Format response (exclude actual passwords)
      const passwordsInfo = paginatedPasswords.map(pwd => ({
        _id: pwd._id,
        url: pwd.url,
        username: pwd.username,
        strengthScore: pwd.strengthScore,
        lastUpdated: pwd.lastUpdated,
        nextUpdateReminder: pwd.nextUpdateReminder,
        notes: pwd.notes
      }));
      
      res.status(200).json({
        success: true,
        count: filteredPasswords.length,
        totalPages: Math.ceil(filteredPasswords.length / limit),
        currentPage: page,
        passwords: passwordsInfo
      });
      
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };
  
  // Update reminder settings
  export const updateReminderSettings = async (req, res) => {
    try {
      const user = await User.findById(req.user._id);
      
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      
      const { reminderFrequency } = req.body;
      
      // Validate reminder frequency
      if (reminderFrequency < 30 || reminderFrequency > 365) {
        return res.status(400).json({
          success: false,
          message: "Reminder frequency must be between 30 and 365 days"
        });
      }
      
      user.reminderFrequency = reminderFrequency;
      await user.save();
      
      res.status(200).json({
        success: true,
        message: "Reminder settings updated successfully",
        reminderFrequency: user.reminderFrequency
      });
      
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };
  
  // Helper function to generate password improvement recommendations
  function generatePasswordRecommendation() {
    const uppercaseLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercaseLetters = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const specialCharacters = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
    // Combine all character sets
    const allCharacters = uppercaseLetters + lowercaseLetters + numbers + specialCharacters;
  
    let password = '';
  
    // Ensure the password contains at least one character from each set
    password += uppercaseLetters[Math.floor(Math.random() * uppercaseLetters.length)];
    password += lowercaseLetters[Math.floor(Math.random() * lowercaseLetters.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += specialCharacters[Math.floor(Math.random() * specialCharacters.length)];
  
    // Fill the rest of the password with random characters
    const remainingLength = 12 - password.length; // Ensure the password is at least 12 characters long
    for (let i = 0; i < remainingLength; i++) {
      password += allCharacters[Math.floor(Math.random() * allCharacters.length)];
    }
  
    // Shuffle the password to ensure randomness
    password = password.split('').sort(() => Math.random() - 0.5).join('');
  
    return  password;
  }