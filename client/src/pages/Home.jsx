import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { server } from '../constants/config';
import toast from 'react-hot-toast';

const Home = () => {
  const [passwords, setPasswords] = useState([]);
  const [filteredPasswords, setFilteredPasswords] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [selectedPassword, setSelectedPassword] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showRecommendedPassword, setShowRecommendedPassword] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState({
    url: '',
    username: '',
    password: '',
    notes: ''
  });
  const [editPassword, setEditPassword] = useState({
    _id: '',
    url: '',
    username: '',
    password: '',
    notes: ''
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [sortType, setSortType] = useState('alphabetical-asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [passwordsNeedingUpdate, setPasswordsNeedingUpdate] = useState([]);
  const itemsPerPage = 15;

  useEffect(() => {
    fetchPasswords();
    fetchPasswordsNeedingUpdate();
  }, []);

  const handleReload = async () => {
    await fetchPasswords();
    await fetchPasswordsNeedingUpdate();
  };

  useEffect(() => {
    filterAndSortPasswords();
  }, [passwords, searchQuery, sortType]);

  const fetchPasswords = async () => {
    try {
      const response = await axios.get(`${server}/api/v1/passwords`, {
        withCredentials: true
      });
      setPasswords(response.data.passwords);
    } catch (error) {
      console.error('Error fetching passwords:', error);
    }
  };

  const handlePasswordClick = async (password) => {
    try {
      const response = await axios.get(`${server}/api/v1/passwords/${password._id}`, {
        withCredentials: true
      });

      if (response.data.success) {
        setSelectedPassword(response.data.password); // Set the decrypted password
        setIsPasswordModalOpen(true);
        setShowPassword(false); // Hide password by default
      } else {
        alert("Failed to fetch password details.");
      }
    } catch (error) {
      console.error("Error fetching password details:", error);
      alert("Failed to fetch password details.");
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleCopyPassword = (password) => {
    navigator.clipboard.writeText(password)
      .then(() => {
        toast.success('Password copied to clipboard!');
      })
      .catch((err) => {
        console.error('Failed to copy password:', err);
        toast.error('Failed to copy password.');
      });
  };

  const fetchPasswordsNeedingUpdate = async () => {
    try {
      const response = await axios.get(`${server}/api/v1/passwords/update-needed`, {
        withCredentials: true
      });
      setPasswordsNeedingUpdate(response.data.passwords);
    } catch (error) {
      console.error('Error fetching passwords needing update:', error);
    }
  };

  const filterAndSortPasswords = () => {
    let filtered = passwords.filter(password =>
      password.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      password.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      password.notes.toLowerCase().includes(searchQuery.toLowerCase())
    );

    switch (sortType) {
      case 'alphabetical-asc':
        filtered.sort((a, b) => a.url.localeCompare(b.url));
        break;
      case 'alphabetical-desc':
        filtered.sort((a, b) => b.url.localeCompare(a.url));
        break;
      case 'date-asc':
        filtered.sort((a, b) => new Date(a.lastUpdated) - new Date(b.lastUpdated));
        break;
      case 'date-desc':
        filtered.sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));
        break;
      case 'last-30-days':
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        filtered = filtered.filter(password => new Date(password.lastUpdated) >= thirtyDaysAgo);
        break;
      case 'last-6-months':
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        filtered = filtered.filter(password => new Date(password.lastUpdated) >= sixMonthsAgo);
        break;
      default:
        break;
    }

    setFilteredPasswords(filtered);
  };

  const handleAddPassword = async () => {
    try {
      await axios.post(`${server}/api/v1/passwords`, newPassword, {
        withCredentials: true
      });
      setIsModalOpen(false);
      setNewPassword({ url: '', username: '', password: '', notes: '' });
      fetchPasswords();
      toast.success('Password added successfully!');
    } catch (error) {
      toast.error('Error adding password:', error.message);
    }
  };

  const handleDeletePassword = async (id) => {
    try {
      await axios.delete(`${server}/api/v1/passwords/${id}`, {
        withCredentials: true
      });
      fetchPasswords();
      toast.success('Password deleted successfully!');
    } catch (error) {
      toast.error('Error deleting password:', error.message);
    }
  };

  const handleUpdatePassword = async () => {
    try {
      await axios.put(`${server}/api/v1/passwords/${editPassword._id}`, editPassword, {
        withCredentials: true
      });
      setIsEditModalOpen(false);
      fetchPasswords();
      toast.success('Password updated successfully!');
    } catch (error) {
      toast.error("Error details:", error.response?.data || error.message);
    }
  };

  const handleEditPassword = async (password) => {
    try {
      // Fetch the password details including the actual password
      const response = await axios.get(`${server}/api/v1/passwords/${password._id}`, {
        withCredentials: true
      });
  
      if (response.data.success) {
        const passwordDetails = response.data.password;
  
        // Check the password strength and get a recommendation if needed
        const strengthResponse = await axios.post(`${server}/api/v1/check-password-strength`, 
          { password: passwordDetails.password }, 
          { withCredentials: true }
        );
  
        if (strengthResponse.data.success) {
          setEditPassword({
            ...passwordDetails,
            strengthScore: strengthResponse.data.strengthScore,
            strengthCategory: strengthResponse.data.strengthCategory,
            recommendation: strengthResponse.data.recommendation,
            recommendedPassword: strengthResponse.data.recommendedPassword,
            details: strengthResponse.data.details
          });
          setIsEditModalOpen(true);
          setShowPassword(false); // Reset password visibility
        }
      }
    } catch (error) {
      console.error('Error fetching password details or strength:', error);
      toast.error('Failed to fetch password details');
    }
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleSortChange = (e) => {
    setSortType(e.target.value);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

const handleReloadRecommendedPassword = async () => {
  try {
    const response = await axios.post(`${server}/api/v1/check-password-strength`, 
      { password: editPassword.password }, 
      { withCredentials: true }
    );

    if (response.data.success) {
      setEditPassword(prevState => ({
        ...prevState,
        strengthScore: response.data.strengthScore,
        strengthCategory: response.data.strengthCategory,
        recommendation: response.data.recommendation,
        recommendedPassword: response.data.recommendedPassword,
        details: response.data.details
      }));
      toast.success('New password recommendation generated!');
    }
  } catch (error) {
    console.error('Error fetching new password recommendation:', error);
    toast.error('Failed to generate new password recommendation');
  }
};

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentPasswords = filteredPasswords.slice(indexOfFirstItem, indexOfLastItem);

  const totalPages = Math.ceil(filteredPasswords.length / itemsPerPage);

  const getPasswordStrengthLabel = (strengthScore) => {
    if (strengthScore >= 80) return 'Very Strong';
    if (strengthScore >= 60) return 'Strong';
    if (strengthScore >= 40) return 'Medium';
    return 'Weak';
  };

  const getPasswordStrengthColor = (strengthScore) => {
    if (strengthScore >= 80) return 'text-blue-500';
    if (strengthScore >= 60) return 'text-blue-500';
    if (strengthScore >= 40) return 'text-yellow-500';
    return 'text-red-500';
  };

  const needsUpdate = (passwordId) => {
    return passwordsNeedingUpdate.some(pwd => pwd._id === passwordId);
  };

  return (
    <>
      <div className="absolute inset-0 -z-10 h-full w-full bg-green-50 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]">
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-white opacity-20 blur-[100px]"></div>
      </div>
      <div className="p-4">
        {/* Speed Dial for Adding Password */}
        <div data-dial-init className="fixed end-6 bottom-6 group">
          <div id="speed-dial-menu-default" className="flex flex-col items-center hidden mb-4 space-y-2">
            <button
              type="button"
              data-tooltip-target="tooltip-share"
              data-tooltip-placement="left"
              className="flex justify-center items-center w-[52px] h-[52px] text-gray-400 hover:text-white bg-gray-800 rounded-full border border-gray-700 shadow-xs hover:bg-gray-700 focus:ring-4 focus:ring-gray-300 focus:outline-none"
              onClick={() => setIsModalOpen(true)}
            >
              <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 18 18">
                <path d="M14.419 10.581a3.564 3.564 0 0 0-2.574 1.1l-4.756-2.49a3.54 3.54 0 0 0 .072-.71 3.55 3.55 0 0 0-.043-.428L11.67 6.1a3.56 3.56 0 1 0-.831-2.265c.006.143.02.286.043.428L6.33 6.218a3.573 3.573 0 1 0-.175 4.743l4.756 2.491a3.58 3.58 0 1 0 3.508-2.871Z" />
              </svg>
              <span className="sr-only">Add Password</span>
            </button>
          </div>
          <button
            type="button"
            data-dial-toggle="speed-dial-menu-default"
            aria-controls="speed-dial-menu-default"
            aria-expanded="false"
            className="flex items-center justify-center text-white bg-green-700 rounded-full w-14 h-14 hover:bg-green-800 focus:ring-4 focus:ring-green-300 focus:outline-none"
            onClick={() => setIsModalOpen(true)}
          >
            <svg className="w-5 h-5 transition-transform group-hover:rotate-45" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 18 18">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 1v16M1 9h16" />
            </svg>
            <span className="sr-only">Open actions menu</span>
          </button>
        </div>

        {/* Modal for Adding Password */}
        {isModalOpen && (
          <div id="crud-modal" tabIndex="-1" aria-hidden="true" className="fixed top-0 right-0 left-0 z-50 flex justify-center items-center w-full h-full bg-black bg-opacity-50">
            <div className="relative p-4 w-full max-w-md">
              <div className="relative bg-gray-800 rounded-lg shadow">
                <div className="flex items-center justify-between p-4 md:p-5 border-b rounded-t border-gray-700">
                  <h3 className="text-lg font-semibold text-white">
                    Add New Password
                  </h3>
                  <button
                    type="button"
                    className="text-gray-400 bg-transparent hover:bg-gray-700 hover:text-white rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center"
                    onClick={() => setIsModalOpen(false)}
                  >
                    <svg className="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
                      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
                    </svg>
                    <span className="sr-only">Close modal</span>
                  </button>
                </div>
                <form className="p-4 md:p-5" onSubmit={(e) => { e.preventDefault(); handleAddPassword(); }}>
                  <div className="grid gap-4 mb-4 grid-cols-2">
                    <div className="col-span-2">
                      <label htmlFor="url" className="block mb-2 text-sm font-medium text-white">URL</label>
                      <input
                        type="text"
                        name="url"
                        id="url"
                        className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block w-full p-2.5 placeholder-gray-400"
                        placeholder="Enter URL"
                        value={newPassword.url}
                        onChange={(e) => setNewPassword({ ...newPassword, url: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label htmlFor="username" className="block mb-2 text-sm font-medium text-white">Username</label>
                      <input
                        type="text"
                        name="username"
                        id="username"
                        className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block w-full p-2.5 placeholder-gray-400"
                        placeholder="Enter Username"
                        value={newPassword.username}
                        onChange={(e) => setNewPassword({ ...newPassword, username: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label htmlFor="password" className="block mb-2 text-sm font-medium text-white">Password</label>
                      <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  id="password"
                  className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block w-full p-2.5 placeholder-gray-400"
                  placeholder="Enter Password"
                  value={newPassword.password}
                  onChange={(e) => setNewPassword({ ...newPassword, password: e.target.value })}
                  required
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye-off">
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                      <line x1="2" x2="22" y1="2" y2="22" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
                    </div>
                    <div className="col-span-2">
                      <label htmlFor="notes" className="block mb-2 text-sm font-medium text-white">Notes</label>
                      <textarea
                        id="notes"
                        rows="4"
                        className="block p-2.5 w-full text-sm text-white bg-gray-700 rounded-lg border border-gray-600 focus:ring-green-500 focus:border-green-500 placeholder-gray-400"
                        placeholder="Write notes here"
                        value={newPassword.notes}
                        onChange={(e) => setNewPassword({ ...newPassword, notes: e.target.value })}
                      ></textarea>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="text-white inline-flex items-center bg-green-700 hover:bg-green-800 focus:ring-4 focus:outline-none focus:ring-green-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center"
                  >
                    <svg className="me-1 -ms-1 w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd"></path>
                    </svg>
                    Add new password
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Modal to show password data */}
        {isPasswordModalOpen && selectedPassword && (
          <div id="password-modal" tabIndex="-1" aria-hidden="true" className="fixed top-0 right-0 left-0 z-50 flex justify-center items-center w-full h-full bg-black bg-opacity-50">
            <div className="relative p-4 w-full max-w-md">
              <div className="relative bg-gray-800 rounded-lg shadow">
                <div className="flex items-center justify-between p-4 md:p-5 border-b rounded-t border-gray-700">
                  <h3 className="text-lg font-semibold text-white">
                    Password Details
                  </h3>
                  <button
                    type="button"
                    className="text-gray-400 bg-transparent hover:bg-gray-700 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center hover:text-white"
                    onClick={() => setIsPasswordModalOpen(false)}
                  >
                    <svg className="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
                      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
                    </svg>
                    <span className="sr-only">Close modal</span>
                  </button>
                </div>
                <div className="p-4 md:p-5">
                  <div className="grid gap-4 mb-4">
                    <div>
                      <label htmlFor="url" className="block mb-2 text-sm font-medium text-white">URL</label>
                      <input
                        type="text"
                        name="url"
                        id="url"
                        className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block w-full p-2.5 placeholder-gray-400"
                        value={selectedPassword.url}
                        readOnly
                      />
                    </div>
                    <div>
                      <label htmlFor="username" className="block mb-2 text-sm font-medium text-white">Username</label>
                      <input
                        type="text"
                        name="username"
                        id="username"
                        className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block w-full p-2.5 placeholder-gray-400"
                        value={selectedPassword.username}
                        readOnly
                      />
                    </div>
                    <div>
                      <label htmlFor="password" className="block mb-2 text-sm font-medium text-white">Password</label>
                      <div className="flex items-center">
                        <input
                          type={showPassword ? "text" : "password"}
                          name="password"
                          id="password"
                          className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block w-full p-2.5 placeholder-gray-400"
                          value={selectedPassword.password}
                          readOnly
                        />
                        <button
                          type="button"
                          className="ml-2 p-2 text-gray-400 hover:text-white focus:outline-none"
                          onClick={togglePasswordVisibility}
                        >
                          {showPassword ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye-off">
                              <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                              <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                              <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                              <line x1="2" x2="22" y1="2" y2="22" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye">
                              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          )}
                        </button>
                        <button
                          type="button"
                          className="ml-2 p-2 text-gray-400 hover:text-white focus:outline-none"
                          onClick={() => handleCopyPassword(selectedPassword.password)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-copy">
                            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div>
                      <label htmlFor="notes" className="block mb-2 text-sm font-medium text-white">Notes</label>
                      <textarea
                        id="notes"
                        rows="4"
                        className="block p-2.5 w-full text-sm text-white bg-gray-700 rounded-lg border border-gray-600 focus:ring-green-500 focus:border-green-500 placeholder-gray-400"
                        value={selectedPassword.notes}
                        readOnly
                      ></textarea>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal for Editing Password */}
        {isEditModalOpen && (
  <div id="crud-modal" tabIndex="-1" aria-hidden="true" className="fixed top-0 right-0 left-0 z-50 flex justify-center items-center w-full h-full bg-black bg-opacity-50">
    <div className="relative p-4 w-full max-w-md">
      <div className="relative bg-gray-800 rounded-lg shadow">
        <div className="flex items-center justify-between p-4 md:p-5 border-b rounded-t border-gray-700">
          <h3 className="text-lg font-semibold text-white">
            Edit Password
          </h3>
          <button
            type="button"
            className="text-gray-400 bg-transparent hover:bg-gray-700 hover:text-white rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center"
            onClick={() => setIsEditModalOpen(false)}
          >
            <svg className="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
            </svg>
            <span className="sr-only">Close modal</span>
          </button>
        </div>
        <form className="p-4 md:p-5" onSubmit={(e) => { e.preventDefault(); handleUpdatePassword(); }}>
          <div className="grid gap-4 mb-4 grid-cols-2">
            <div className="col-span-2">
              <label htmlFor="url" className="block mb-2 text-sm font-medium text-white">URL</label>
              <input
                type="text"
                name="url"
                id="url"
                className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block w-full p-2.5 placeholder-gray-400"
                placeholder="Enter URL"
                value={editPassword.url}
                onChange={(e) => setEditPassword({ ...editPassword, url: e.target.value })}
                required
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label htmlFor="username" className="block mb-2 text-sm font-medium text-white">Username</label>
              <input
                type="text"
                name="username"
                id="username"
                className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block w-full p-2.5 placeholder-gray-400"
                placeholder="Enter Username"
                value={editPassword.username}
                onChange={(e) => setEditPassword({ ...editPassword, username: e.target.value })}
                required
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label htmlFor="password" className="block mb-2 text-sm font-medium text-white">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  id="password"
                  className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block w-full p-2.5 placeholder-gray-400"
                  placeholder="Enter Password"
                  value={editPassword.password}
                  onChange={(e) => setEditPassword({ ...editPassword, password: e.target.value })}
                  required
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye-off">
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                      <line x1="2" x2="22" y1="2" y2="22" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <div className="col-span-2">
              <label htmlFor="notes" className="block mb-2 text-sm font-medium text-white">Notes</label>
              <textarea
                id="notes"
                rows="4"
                className="block p-2.5 w-full text-sm text-white bg-gray-700 rounded-lg border border-gray-600 focus:ring-green-500 focus:border-green-500 placeholder-gray-400"
                placeholder="Write notes here"
                value={editPassword.notes}
                onChange={(e) => setEditPassword({ ...editPassword, notes: e.target.value })}
              ></textarea>
            </div>

            {/* Password Strength Section */}
            <div className="col-span-2">
              <div className="mb-4">
                <label className="block mb-2 text-sm font-medium text-white">Password Strength</label>
                <div className="flex items-center space-x-2">
                  <div className="w-full bg-gray-700 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full ${
                        editPassword.strengthScore >= 80 ? 'bg-green-500' :
                        editPassword.strengthScore >= 60 ? 'bg-blue-500' :
                        editPassword.strengthScore >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${editPassword.strengthScore}%` }}
                    ></div>
                  </div>
                  <span className={`text-sm font-medium ${getPasswordStrengthColor(editPassword.strengthScore)}`}>
                    {getPasswordStrengthLabel(editPassword.strengthScore)}
                  </span>
                </div>
              </div>
            </div>

            {/* Warning Section */}
            {editPassword.recommendation?.warning && (
              <div className="col-span-2">
                <div className="p-3 bg-red-900 bg-opacity-30 border border-red-700 rounded-lg mb-4">
                  <p className="text-red-400 text-sm">
                    <span className="font-bold">Warning: </span>
                    {editPassword.recommendation.warning}
                  </p>
                </div>
              </div>
            )}

            {/* Suggestions Section */}
            {editPassword.recommendation?.suggestions && editPassword.recommendation.suggestions.length > 0 && (
              <div className="col-span-2">
                <label className="block mb-2 text-sm font-medium text-white">Suggestions</label>
                <ul className="list-disc pl-5 mb-4 text-sm text-gray-300">
                  {editPassword.recommendation.suggestions.map((suggestion, index) => (
                    <li key={index}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommended Password Section */}
            {editPassword.recommendedPassword && (
              <div className="col-span-2">
                <label className="block mb-2 text-sm font-medium text-white">Recommended Password</label>
                <div className="flex items-center">
                  <input
                    type={showRecommendedPassword ? "text" : "password"}
                    className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block w-full p-2.5 placeholder-gray-400"
                    value={editPassword.recommendedPassword.value || ''}
                    readOnly
                  />
                  {/* Toggle visibility Button */}
                  <button
                    type="button"
                    className="ml-2 p-2 text-gray-400 hover:text-white focus:outline-none"
                    onClick={() => setShowRecommendedPassword(!showPassword)}
                    title="Toggle Password Visibility"
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye-off">
                        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                        <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                        <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                        <line x1="2" x2="22" y1="2" y2="22" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye">
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                  {/* Copy Button */}
                  <button
                    type="button"
                    className="ml-2 p-2 text-gray-400 hover:text-white focus:outline-none"
                    onClick={() => {
                      navigator.clipboard.writeText(editPassword.recommendedPassword.value || '')
                        .then(() => toast.success('Password copied to clipboard!'))
                        .catch(() => toast.error('Failed to copy password.'));
                    }}
                    title="Copy Password"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-copy">
                      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                    </svg>
                  </button>
                  {/* Use Button */}
                  <button
                    type="button"
                    className="ml-2 p-2 text-gray-400 hover:text-white focus:outline-none"
                    onClick={() => {
                      setEditPassword({
                        ...editPassword,
                        password: editPassword.recommendedPassword.value || '',
                        strengthScore: editPassword.recommendedPassword.score || 100
                      });
                      toast.success('Recommended password applied!');
                    }}
                    title="Use This Password"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check-circle">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  </button>
                  {/* Reload Button */}
                  <button
                    type="button"
                    className="ml-2 p-2 text-gray-400 hover:text-white focus:outline-none"
                    onClick={handleReloadRecommendedPassword}
                    title="Get New Recommendation"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-refresh-ccw">
                      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                      <path d="M3 3v5h5" />
                      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                      <path d="M16 16h5v5" />
                    </svg>
                  </button>
                </div>
                <p className="mt-1 text-xs text-green-400">
                  Score: {editPassword.recommendedPassword.score}/100 ({editPassword.recommendedPassword.category})
                </p>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <button
              type="submit"
              className="text-white inline-flex items-center bg-green-700 hover:bg-green-800 focus:ring-4 focus:outline-none focus:ring-green-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center"
            >
              <svg className="me-1 -ms-1 w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd"></path>
              </svg>
              Update password
            </button>
            <button
              type="button"
              className="text-gray-300 inline-flex items-center bg-gray-700 hover:bg-gray-600 focus:ring-4 focus:outline-none focus:ring-gray-600 font-medium rounded-lg text-sm px-5 py-2.5 text-center"
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
)}

        {/* Table for Displaying Passwords */}
        <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
          <div className="flex flex-column sm:flex-row flex-wrap space-y-4 sm:space-y-0 items-center justify-between p-4 bg-gray-900">
            <div>
              <select
                value={sortType}
                onChange={handleSortChange}
                className="inline-flex items-center text-gray-400 bg-gray-800 border border-gray-700 focus:outline-none hover:bg-gray-700 focus:ring-4 focus:ring-gray-700 font-medium rounded-lg text-sm px-3 py-1.5"
              >
                <option value="alphabetical-asc">Alphabetical (A-Z)</option>
                <option value="alphabetical-desc">Alphabetical (Z-A)</option>
                <option value="date-asc">Date (Oldest First)</option>
                <option value="date-desc">Date (Newest First)</option>
                <option value="last-30-days">Last 30 Days</option>
                <option value="last-6-months">Last 6 Months</option>
              </select>
            </div>
            <label htmlFor="table-search" className="sr-only">Search</label>
            <div className="relative flex items-center">
              <div className="absolute inset-y-0 left-0 rtl:inset-r-0 rtl:right-0 flex items-center ps-3 pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"></path>
                </svg>
              </div>
              <input
                type="text"
                id="table-search"
                className="block p-2 ps-10 text-sm text-white bg-gray-700 border border-gray-600 rounded-lg w-80 focus:ring-green-500 focus:border-green-500 placeholder-gray-400"
                placeholder="Search for items"
                value={searchQuery}
                onChange={handleSearchChange}
              />
              <button
                onClick={handleReload}
                className="ml-2 p-2 text-gray-400 hover:text-white focus:outline-none"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-refresh-ccw">
                  <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                  <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                  <path d="M16 16h5v5" />
                </svg>
              </button>
            </div>
          </div>
          <table className="w-full text-sm text-left rtl:text-right text-gray-400">
            <thead className="text-xs text-gray-400 uppercase bg-gray-700">
              <tr>
                <th scope="col" className="px-6 py-3">URL</th>
                <th scope="col" className="px-6 py-3">Username</th>
                <th scope="col" className="px-6 py-3">Password Strength</th>
                <th scope="col" className="px-6 py-3">Last Updated</th>
                <th scope="col" className="px-6 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {currentPasswords.map((password) => (
                <tr key={password._id} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-700">
                  <td onClick={() => handlePasswordClick(password)} className="px-6 py-4 font-medium text-white whitespace-nowrap">{password.url}</td>
                  <td onClick={() => handlePasswordClick(password)} className="px-6 py-4">{password.username}</td>
                  <td onClick={() => handlePasswordClick(password)} className={`px-6 py-4 ${getPasswordStrengthColor(password.strengthScore)}`}>
                    {getPasswordStrengthLabel(password.strengthScore)}
                  </td>
                  <td onClick={() => handlePasswordClick(password)} className="px-6 py-4">{new Date(password.lastUpdated).toLocaleDateString()}</td>
                  <td className="px-6 py-4 flex items-center space-x-2">
                    {needsUpdate(password._id) && (
                      <div className="relative inline-block">
                        <button
                          data-tooltip-target={`tooltip-${password._id}`}
                          type="button"
                          className="text-yellow-400 hover:text-yellow-500 focus:outline-none"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                          </svg>
                        </button>
                        <div
                          id={`tooltip-${password._id}`}
                          role="tooltip"
                          className="absolute z-10 invisible inline-block px-3 py-2 text-sm font-medium text-white transition-opacity duration-300 bg-gray-900 rounded-lg shadow-xs opacity-0 tooltip"
                        >
                          Update Password
                          <div className="tooltip-arrow" data-popper-arrow></div>
                        </div>
                      </div>
                    )}
                    <button
                      className="text-gray-400 hover:text-green-500 focus:outline-none"
                      onClick={() => handleEditPassword(password)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil">
                        <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
                        <path d="m15 5 4 4" />
                      </svg>
                    </button>
                    <button
                      className="text-gray-400 hover:text-red-500 focus:outline-none"
                      onClick={() => handleDeletePassword(password._id)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash">
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Pagination */}
          <nav aria-label="Page navigation example" className="flex justify-center bg-gray-900 py-2">
            <ul className="flex items-center -space-x-px h-10 text-base">
              <li>
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="flex items-center justify-center px-4 h-10 ms-0 leading-tight text-gray-400 bg-gray-800 border border-gray-700 rounded-s-lg hover:bg-gray-700 hover:text-white"
                >
                  <span className="sr-only">Previous</span>
                  <svg className="w-3 h-3 rtl:rotate-180" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 10">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 1 1 5l4 4" />
                  </svg>
                </button>
              </li>
              {Array.from({ length: totalPages }, (_, index) => (
                <li key={index + 1}>
                  <button
                    onClick={() => handlePageChange(index + 1)}
                    className={`flex items-center justify-center px-4 h-10 leading-tight ${
                      currentPage === index + 1
                        ? 'text-gray-100 border border-gray-600 bg-gray-600 hover:bg-gray-500 hover:text-gray-100'
                        : 'text-gray-400 bg-gray-800 border border-gray-700 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    {index + 1}
                  </button>
                </li>
              ))}
              <li>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="flex items-center justify-center px-4 h-10 leading-tight text-gray-400 bg-gray-800 border border-gray-700 rounded-e-lg hover:bg-gray-700 hover:text-white"
                >
                  <span className="sr-only">Next</span>
                  <svg className="w-3 h-3 rtl:rotate-180" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 10">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 9 4-4-4-4" />
                  </svg>
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </>
  );
};

export default Home;