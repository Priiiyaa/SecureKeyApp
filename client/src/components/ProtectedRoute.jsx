import React, { useState, useEffect, useCallback, memo } from "react";
import { Navigate, Outlet } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { server } from "../constants/config";
import Navbar from "../components/Navbar";

// Memoized MFA Modal component to prevent re-rendering
const MFAModal = memo(({ 
  otp, 
  setOtp, 
  handleMFASubmit, 
  requestMFACode, 
  isLoading, 
  isResendingOTP 
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="relative p-4 w-full max-w-md max-h-full">
        <div className="relative bg-gray-800 rounded-lg shadow">
          <div className="flex items-center justify-between p-4 md:p-5 border-b rounded-t border-gray-700">
            <h3 className="text-xl font-semibold text-white">
              MFA Verification Required
            </h3>
          </div>
          <div className="p-4 md:p-5">
            <p className="mb-4 text-sm text-gray-400">
              A verification code has been sent to your email. Please enter it
              below to continue.
            </p>
            <form className="space-y-4" onSubmit={handleMFASubmit}>
              <div>
                <label
                  htmlFor="otp"
                  className="block mb-2 text-sm font-medium text-white"
                >
                  Enter OTP
                </label>
                <input
                  type="text"
                  name="otp"
                  id="otp"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block w-full p-2.5 placeholder-gray-400"
                  placeholder="Enter OTP"
                  required
                  autoFocus
                />
              </div>
              <div className="flex flex-col space-y-2">
                <button
                  type="submit"
                  className="w-full text-white bg-green-700 hover:bg-green-800 focus:ring-4 focus:outline-none focus:ring-green-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center"
                  disabled={isLoading}
                >
                  {isLoading ? "Verifying..." : "Verify OTP"}
                </button>
                <button
                  type="button"
                  onClick={requestMFACode}
                  disabled={isResendingOTP}
                  className="text-sm text-green-500 hover:underline self-center"
                >
                  {isResendingOTP
                    ? "Sending..."
                    : "Didn't receive code? Resend"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
});

const ProtectedRoute = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMFAModalOpen, setIsMFAModalOpen] = useState(false);
  const [otp, setOtp] = useState("");
  const [isResendingOTP, setIsResendingOTP] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);


const checkAuthStatus = async () => {
  setIsLoading(true);
  try {
    const response = await axios.get(`${server}/api/v1/me`, {
      withCredentials: true,
    });

    if (response.data.success) {
      const user = response.data.user;
      const mfaSessionExpiry = user.mfaSessionExpiry
        ? new Date(user.mfaSessionExpiry)
        : null;


      if (
        !user.mfaVerified ||
        (mfaSessionExpiry && mfaSessionExpiry < new Date()) ||
        localStorage.getItem('mfaRequired') === 'true'
      ) {
        setIsMFAModalOpen(true);
        requestMFACode();

        localStorage.removeItem('mfaRequired');
      } else {
        setIsAuthenticated(true);
      }
    }
  } catch (error) {
    console.error("Auth check error:", error.response?.status, error.response?.data);
    

    if (error.response?.status === 403 && error.response?.data?.requireMFA) {
      setIsMFAModalOpen(true);
      requestMFACode();
    } else {

      setIsAuthenticated(false);
    }
  } finally {
    setIsLoading(false);
  }
};

  const requestMFACode = useCallback(async () => {
    setIsResendingOTP(true);
    try {
      await axios.post(
        `${server}/api/v1/send-mfa-code`,
        {},
        { withCredentials: true }
      );
      toast.success("Verification code sent to your email");
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to send verification code"
      );
    } finally {
      setIsResendingOTP(false);
    }
  }, []);

  const handleMFASubmit = useCallback(async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await axios.post(
        `${server}/api/v1/verify-mfa`,
        { otp },
        { withCredentials: true }
      );
  
      if (response.data.success) {
        setIsMFAModalOpen(false);
        setIsAuthenticated(true);
        localStorage.removeItem('mfaRequired');
        toast.success("Verification successful!");
      } else {
        toast.error("Invalid OTP");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "MFA verification failed");
    } finally {
      setIsLoading(false);
    }
  }, [otp]);

  if (isLoading && !isMFAModalOpen) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-900 text-white">
        Loading...
      </div>
    );
  }

  // Show MFA verification modal when needed
  if (isMFAModalOpen) {
    return (
      <>
        <MFAModal
          otp={otp}
          setOtp={setOtp}
          handleMFASubmit={handleMFASubmit}
          requestMFACode={requestMFACode}
          isLoading={isLoading}
          isResendingOTP={isResendingOTP}
        />
        <div className="flex justify-center items-center h-screen bg-gray-900 text-white">
          MFA verification required to continue
        </div>
      </>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return (
    <>
      <Navbar />
      <Outlet />
    </>
  );
};

export default ProtectedRoute;