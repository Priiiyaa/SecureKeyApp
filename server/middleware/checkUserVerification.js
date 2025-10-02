import { User } from "../models/users.js";

// Middleware to check if user is verified
export const checkUserVerification = async (req, res, next) => {
    try {
      const user = await User.findById(req.user._id);
  
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
  
      if (!user.verified) {
        return res.status(403).json({ 
          success: false, 
          message: "User is not verified. Please verify your account to perform this action." 
        });
      }
  
      next();
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };