import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { server } from '../constants/config';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMFAModalOpen, setIsMFAModalOpen] = useState(false);
  const [otp, setOtp] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await axios.get(`${server}/api/v1/me`, { withCredentials: true });
      if (response.data.success) {
        // User is authenticated, redirect to home page
        // Let the ProtectedRoute component handle any MFA verification if needed
        navigate('/');
      }
    } catch (error) {
      // User is not authenticated, stay on register page
    }
  };


const handleRegister = async (e) => {
  e.preventDefault();
  setIsLoading(true);

  if (password !== confirmPassword) {
    toast.error("Passwords do not match");
    setIsLoading(false);
    return;
  }

  try {
    const response = await axios.post(`${server}/api/v1/register`, { name, email, password }, {
      headers: { 'Content-Type': 'multipart/form-data' },
      withCredentials: true,
    });

    if (response.data.success) {
      toast.success("Registration successful!");
      

      if (response.data.requireMFA) {
        localStorage.setItem('mfaRequired', 'true');
        navigate('/'); 
      } else {

        navigate('/login'); 
      }
    }
  } catch (error) {
    toast.error(error.response?.data?.message || "Registration failed");
  } finally {
    setIsLoading(false);
  }
};

  const requestMFACode = async () => {
    setIsLoading(true);
    try {
      await axios.post(`${server}/api/v1/send-mfa-code`, {}, {
        withCredentials: true
      });
      toast.success("Verification code sent to your email");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send verification code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMFASubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await axios.post(`${server}/api/v1/verify-mfa`, { otp }, {
        withCredentials: true
      });

      if (response.data.success) {
        toast.success("MFA verification successful!");
        setIsMFAModalOpen(false);
        navigate('/'); // Redirect to home after successful MFA verification
      } else {
        toast.error("Invalid OTP");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "MFA verification failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="absolute inset-0 -z-10 h-full w-full bg-green-50 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]">
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-white opacity-20 blur-[100px]"></div>
      </div>
      <div className="flex justify-center items-center">
        <div className="w-full max-w-sm p-4 bg-gray-800 border border-gray-700 rounded-lg shadow sm:p-6 md:p-8 mt-20">
          <form className="space-y-6" onSubmit={handleRegister}>
            <h5 className="text-2xl font-medium text-white">Register on <span className='text-green-500'>SecureKey&#60;&#47;&#62;</span></h5>
            <div>
              <label htmlFor="name" className="block mb-2 text-sm font-medium text-white">
                Your Name
              </label>
              <input
                type="text"
                name="name"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block w-full p-2.5 placeholder-gray-400"
                placeholder="John Doe"
                required
              />
            </div>
            <div>
              <label htmlFor="email" className="block mb-2 text-sm font-medium text-white">
                Your Email
              </label>
              <input
                type="email"
                name="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block w-full p-2.5 placeholder-gray-400"
                placeholder="name@company.com"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="block mb-2 text-sm font-medium text-white">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block w-full p-2.5 pr-10 placeholder-gray-400"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-sm text-gray-400 hover:text-white focus:outline-none"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                      <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block mb-2 text-sm font-medium text-white">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block w-full p-2.5 pr-10 placeholder-gray-400"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-sm text-gray-400 hover:text-white focus:outline-none"
                >
                  {showConfirmPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                      <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <button
              type="submit"
              className="w-full text-white bg-green-700 hover:bg-green-800 focus:ring-4 focus:outline-none focus:ring-green-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center"
              disabled={isLoading}
            >
              {isLoading ? "Registering..." : "Register"}
            </button>
            <div className="text-sm font-medium text-gray-400">
              Already registered? <Link to="/login" className="text-green-500 hover:underline">Sign in</Link>
            </div>
          </form>
        </div>

        {isMFAModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="relative p-4 w-full max-w-md max-h-full">
              <div className="relative bg-gray-800 rounded-lg shadow">
                <div className="flex items-center justify-between p-4 md:p-5 border-b rounded-t border-gray-700">
                  <h3 className="text-xl font-semibold text-white">
                    MFA Verification
                  </h3>
                </div>
                <div className="p-4 md:p-5">
                  <p className="mb-4 text-sm text-gray-400">
                    A verification code has been sent to your email. Please enter it below to complete registration.
                  </p>
                  <form className="space-y-4" onSubmit={handleMFASubmit}>
                    <div>
                      <label htmlFor="otp" className="block mb-2 text-sm font-medium text-white">
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
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full text-white bg-green-700 hover:bg-green-800 focus:ring-4 focus:outline-none focus:ring-green-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center"
                      disabled={isLoading}
                    >
                      {isLoading ? "Verifying..." : "Verify OTP"}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Register;