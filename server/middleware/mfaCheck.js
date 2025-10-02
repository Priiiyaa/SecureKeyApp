import { User } from "../models/users.js";

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