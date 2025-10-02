import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { server } from '../constants/config';
import { CircleUser } from 'lucide-react';

const Navbar = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [user, setUser] = useState({});
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
    mfaDuration: 10, // Default value
    reminderFrequency: 90, // Default value as requested
  });

  // Fetch user data when the modal opens
  useEffect(() => {
      fetchUserProfile();
  }, []);

  // Fetch user profile data
  const fetchUserProfile = async () => {
    try {
      const response = await axios.get(`${server}/api/v1/me`, { withCredentials: true });
      setUser(response.data.user);

      // Using the appropriate fields from the response
      setFormData({
        name: response.data.user.name || '',
        email: response.data.user.email || '',
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
        mfaDuration: response.data.mfaSessionDuration || 10, // From the response
        reminderFrequency: response.data.user.reminderFrequency || 90, // Default to 90 as requested
      });
    } catch (error) {
      console.error('Error fetching user profile:', error);
      toast.error('Failed to load profile data');
    }
  };

  // Toggle dropdown
  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  // Toggle modal
  const toggleModal = () => {
    setIsModalOpen(!isModalOpen);
  };

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await axios.get(`${server}/api/v1/logout`, { withCredentials: true });
      toast.success('Logged out successfully!');
      // Redirect to login page or home page
      window.location.href = '/login';
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Failed to logout. Please try again.');
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate passwords match
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('New password and confirm password do not match');
      return;
    }

    try {
      // Update profile
      await axios.put(
        `${server}/api/v1/updateprofile`,
        {
          name: formData.name,
        },
        { withCredentials: true }
      );

      // Update password if provided
      if (formData.newPassword && formData.oldPassword) {
        await axios.put(
          `${server}/api/v1/updatepassword`,
          {
            oldPassword: formData.oldPassword,
            newPassword: formData.newPassword,
          },
          { withCredentials: true }
        );
      }

      // Update MFA session duration
      if (formData.mfaDuration) {
        await axios.put(
          `${server}/api/v1/mfa/duration`,
          {
            duration: parseInt(formData.mfaDuration, 10),
          },
          { withCredentials: true }
        );
      }

      // Update reminder frequency
      if (formData.reminderFrequency) {
        await axios.put(
          `${server}/api/v1/reminder-settings`,
          {
            reminderFrequency: parseInt(formData.reminderFrequency, 10),
          },
          { withCredentials: true }
        );
      }

      // Close the modal
      toggleModal();
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.response?.data?.message || 'Failed to update profile. Please try again.');
    }
  };

  return (
    <nav className="bg-gray-900 border-gray-700">
      <div className="px-10 flex flex-wrap items-center justify-between mx-auto p-4">
        <Link to="/" className="flex items-center space-x-3 rtl:space-x-reverse">
          <img src="secureKey.png" className="h-8" alt="Flowbite Logo" />
          <span className="self-center text-2xl font-semibold whitespace-nowrap text-white">SecureKey</span>
        </Link>
        <div className="flex items-center md:order-2 space-x-3 md:space-x-0 rtl:space-x-reverse">
          <button
            type="button"
            className="flex text-sm bg-gray-800 rounded-full md:me-0 focus:ring-1 focus:ring-gray-300"
            id="user-menu-button"
            aria-expanded="false"
            onClick={toggleDropdown}
          >
            <span className="sr-only">Open user menu</span>
            <CircleUser className="text-white w-8 h-8" />
          </button>
          {/* Dropdown menu */}
          {isDropdownOpen && (
            <div className="z-50 absolute top-10 right-3 my-4 text-base list-none bg-gray-700 divide-y divide-gray-700 rounded-lg shadow-sm" id="user-dropdown">
              <div className="px-4 py-3">
                <span className="block text-sm text-white">{user?.name}</span>
                <span className="block text-sm text-gray-400 truncate">{user?.email}</span>
              </div>
              <ul className="py-2 min-w-[10em]" aria-labelledby="user-menu-button">
                <li>
                  <button
                    onClick={toggleModal}
                    className="block px-4 py-2 text-sm text-gray-400 hover:bg-gray-700 w-full text-left"
                  >
                    Settings
                  </button>
                </li>
                <li>
                  <button
                    onClick={handleLogout}
                    className="block px-4 py-2 text-sm text-gray-400 hover:bg-gray-700 w-full text-left"
                  >
                    Sign out
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Modal for editing profile */}
      {isModalOpen && (
        <div id="crud-modal" tabIndex="-1" aria-hidden="true" className="fixed top-0 right-0 left-0 z-50 flex justify-center items-center w-full h-full bg-black bg-opacity-50">
          <div className="relative p-4 w-full max-w-md max-h-full">
            {/* Modal content */}
            <div className="relative bg-gray-800 rounded-lg shadow">
              {/* Modal header */}
              <div className="flex items-center justify-between p-4 md:p-5 border-b rounded-t border-gray-700">
                <h3 className="text-lg font-semibold text-white">Edit Profile</h3>
                <button
                  type="button"
                  className="text-gray-400 bg-transparent hover:bg-gray-700 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center hover:text-white"
                  onClick={toggleModal}
                >
                  <svg className="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
                  </svg>
                  <span className="sr-only">Close modal</span>
                </button>
              </div>
              {/* Modal body */}
              <form className="p-4 md:p-5" onSubmit={handleSubmit}>
                <div className="grid gap-4 mb-4 grid-cols-2">
                  {/* Full width fields */}
                  <div className="col-span-2">
                    <label htmlFor="name" className="block mb-2 text-sm font-medium text-white">Name</label>
                    <input
                      type="text"
                      name="name"
                      id="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block w-full p-2.5 placeholder-gray-400"
                      placeholder="Enter your name"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <label htmlFor="email" className="block mb-2 text-sm font-medium text-white">Email</label>
                    <input
                      type="email"
                      name="email"
                      id="email"
                      value={formData.email}
                      className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block w-full p-2.5 placeholder-gray-400"
                      placeholder="Enter your email"
                      readOnly
                    />
                  </div>
                  <div className="col-span-2">
                    <label htmlFor="oldPassword" className="block mb-2 text-sm font-medium text-white">Old Password</label>
                    <input
                      type="password"
                      name="oldPassword"
                      id="oldPassword"
                      value={formData.oldPassword}
                      onChange={handleChange}
                      className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block w-full p-2.5 placeholder-gray-400"
                      placeholder="Enter old password"
                    />
                  </div>

                  {/* Two column layout for related fields */}
                  <div className="col-span-1">
                    <label htmlFor="newPassword" className="block mb-2 text-sm font-medium text-white">New Password</label>
                    <input
                      type="password"
                      name="newPassword"
                      id="newPassword"
                      value={formData.newPassword}
                      onChange={handleChange}
                      className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block w-full p-2.5 placeholder-gray-400"
                      placeholder="Enter new password"
                    />
                  </div>
                  <div className="col-span-1">
                    <label htmlFor="confirmPassword" className="block mb-2 text-sm font-medium text-white">Confirm Password</label>
                    <input
                      type="password"
                      name="confirmPassword"
                      id="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block w-full p-2.5 placeholder-gray-400"
                      placeholder="Confirm password"
                    />
                  </div>

                  <div className="col-span-1">
                    <label htmlFor="mfaDuration" className="block mb-2 text-sm font-medium text-white">MFA Duration (mins)</label>
                    <input
                      type="number"
                      name="mfaDuration"
                      id="mfaDuration"
                      value={formData.mfaDuration}
                      onChange={handleChange}
                      className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block w-full p-2.5 placeholder-gray-400"
                      placeholder="MFA duration"
                      min="1"
                      max="60"
                    />
                  </div>
                  <div className="col-span-1">
                    <label htmlFor="reminderFrequency" className="block mb-2 text-sm font-medium text-white">Reminder (days)</label>
                    <input
                      type="number"
                      name="reminderFrequency"
                      id="reminderFrequency"
                      value={formData.reminderFrequency}
                      onChange={handleChange}
                      className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block w-full p-2.5 placeholder-gray-400"
                      placeholder="Reminder frequency"
                      min="30"
                      max="365"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="text-white inline-flex items-center bg-green-700 hover:bg-green-800 focus:ring-4 focus:outline-none focus:ring-green-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center"
                >
                  Save Changes
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;