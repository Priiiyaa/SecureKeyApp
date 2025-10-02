export const sendToken = (res, user, statusCode, message, additionalData = {}) => {
  const token = user.getJWTToken();

  const options = {
    maxAge: 15 * 24 * 60 * 60 * 1000,
    sameSite: "none",
    httpOnly: true,
    secure: true,
    path: "/"
  };

  const mfaInfo = {
    mfaVerified: user.mfaVerified,
    mfaSessionExpiry: user.mfaSessionExpiry,
    mfaSessionDuration: user.mfaSessionDuration
  };

  const userData = {
    _id: user._id,
    name: user.name,
    email: user.email,
    avatar: user.avatar || null,
    verified: user.verified,
    reminderFrequency: user.reminderFrequency,
    token
  };

  res
    .status(statusCode)
    .cookie("secureKey-token", token, options)
    .json({ 
      success: true, 
      token, 
      message,
      user: userData,
      verified: user.verified,
        ...mfaInfo,
      ...additionalData
    });
};