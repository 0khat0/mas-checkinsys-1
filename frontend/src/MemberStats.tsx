import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { isValidUUID, getApiUrl, clearMemberData, getTorontoTime, getTorontoDateString, getMondayOfCurrentWeekToronto, getTorontoDayOfWeek } from './utils';

interface MemberStats {
  monthly_check_ins: number;
  current_streak: number;
  highest_streak: number;
  member_since: string;
  check_in_dates?: string[];
  name?: string;
  email?: string;
}

interface Props {
  memberId: string;
}

const DEFAULT_GOAL = 5;



function MemberStats({ memberId }: Props) {
  const [stats, setStats] = useState<MemberStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [goal, setGoal] = useState<number>(() => {
    const saved = localStorage.getItem('checkin_goal');
    return saved ? parseInt(saved, 10) : DEFAULT_GOAL;
  });
  const [weeklyCheckins, setWeeklyCheckins] = useState<number>(0);
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');

  useEffect(() => {
    // Validate memberId before making API call
    if (!isValidUUID(memberId)) {
      setError('Invalid member ID. Please check in again.');
      setIsLoading(false);
      clearMemberData();
      return;
    }

    const fetchStats = async () => {
      try {
        const API_URL = getApiUrl();
        const response = await fetch(`${API_URL}/member/${memberId}/stats`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('Member not found. Please check in again.');
            clearMemberData();
          } else {
            setError('Failed to load profile. Please try again.');
          }
          return;
        }
        
        const data = await response.json();
        setStats(data);
        setEditName(data.name || '');
        setEditEmail(data.email || '');
        if (data && data.check_in_dates && Array.isArray(data.check_in_dates)) {
          const now = getTorontoTime();
          const monday = getMondayOfCurrentWeekToronto(now);
          
          const mondayString = getTorontoDateString(monday);
          const todayString = getTorontoDateString(now);
          
          const weekCheckins = data.check_in_dates.filter((d: string) => {
            const checkinDateString = d.split('T')[0]; // Get just the date part from ISO string
            return checkinDateString >= mondayString && checkinDateString <= todayString;
          }).length;
          setWeeklyCheckins(weekCheckins);
        } else {
          setWeeklyCheckins(0);
        }
      } catch (error) {
        console.error('Error fetching member stats:', error);
        setError('Network error. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, [memberId]);

  useEffect(() => {
    localStorage.setItem('checkin_goal', goal.toString());
  }, [goal]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-900 rounded-xl p-6">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-white mb-2">Profile Error</h2>
          <p className="text-white/70 mb-4">{error}</p>
          <button
            onClick={() => window.location.href = '/checkin'}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors duration-200"
          >
            Go to Check-In
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-gray-900 rounded-xl p-6">
        <div className="text-center">
          <p className="text-white/70">No profile data available.</p>
        </div>
      </div>
    );
  }

  const percent = Math.round((weeklyCheckins / goal) * 100);

  return (
    <div className="min-h-screen w-full bg-gray-900 font-poppins overflow-x-hidden">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Logo and My Profile Section */}
        {/* Remove the floating My Profile title and divider above the card. */}
        {/* Inside the main profile card (motion.div), add at the top: */}
        {/* <div className="mb-6"> */}
        {/*   <h2 className="text-2xl font-extrabold text-white text-center">My Profile</h2> */}
        {/*   <div className="w-16 h-1 rounded-full bg-gradient-to-r from-red-500 to-red-700 mx-auto mt-2 mb-2" /> */}
        {/* </div> */}
        {/* Then render the rest of the profile fields as before. */}
        <motion.div
          className="bg-gray-800/50 rounded-xl p-6 backdrop-blur-sm border border-white/10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="mb-6 flex flex-col items-start">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-2xl font-extrabold text-white">My Profile</h2>
            </div>
            <div className="w-16 h-1 rounded-full bg-gradient-to-r from-red-500 to-red-700" />
          </div>
          {editMode ? (
            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                setEditError('');
                setEditSuccess('');
                try {
                  const API_URL = getApiUrl();
                  const res = await fetch(`${API_URL}/member/${memberId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: editName, email: editEmail }),
                  });
                  if (res.ok) {
                    setEditSuccess('Profile updated successfully!');
                    setEditMode(false);
                    setStats((prev) => prev ? { ...prev, name: editName, email: editEmail } : prev);
                    localStorage.setItem("member_email", editEmail);
                  } else {
                    const data = await res.json();
                    setEditError(data.detail || 'Failed to update profile.');
                  }
                } catch (err) {
                  setEditError('Network error. Please try again.');
                }
              }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/70 text-sm font-medium mb-2">Full Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter your full name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-white/70 text-sm font-medium mb-2">Email Address</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={e => setEditEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors duration-200 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save Changes
                </button>
                <button
                  type="button"
                  className="bg-gray-600 hover:bg-gray-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors duration-200"
                  onClick={() => { 
                    setEditMode(false); 
                    setEditError(''); 
                    setEditSuccess('');
                    // Reset to original values
                    setEditName(stats.name || '');
                    setEditEmail(stats.email || '');
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="text-white/50 text-sm font-medium mb-1">Full Name</div>
                  <div className="text-white text-lg font-semibold">{stats.name || 'Not set'}</div>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="text-white/50 text-sm font-medium mb-1">Email Address</div>
                  <div className="text-white text-lg font-semibold">{stats.email || 'Not set'}</div>
                </div>
              </div>
              
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors duration-200 flex items-center gap-2"
                onClick={() => setEditMode(true)}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Profile
              </button>
            </div>
          )}
          
          {editError && (
            <motion.div 
              className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {editError}
            </motion.div>
          )}
          {editSuccess && (
            <motion.div 
              className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {editSuccess}
            </motion.div>
          )}
        </motion.div>

        {/* Debug Timezone Info - Remove this after testing */}
        <motion.div 
          className="bg-gray-800/50 rounded-xl p-4 backdrop-blur-sm border border-yellow-500/20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
        >
          <div className="text-center">
            <p className="text-yellow-400 text-sm font-medium mb-2">🌍 Toronto Timezone Debug Info</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-white/70">
              <div>
                <span className="text-white/50">Date:</span> {getTorontoDateString()}
              </div>
              <div>
                <span className="text-white/50">Day:</span> {getTorontoDayOfWeek()}
              </div>
              <div>
                <span className="text-white/50">Time:</span> {getTorontoTime().toLocaleTimeString('en-US', { timeZone: 'America/Toronto' })}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Section */}
        <motion.div 
          className="bg-gray-800/50 rounded-xl p-6 backdrop-blur-sm border border-white/10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <div className="mb-6 flex flex-col items-start">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-extrabold text-white">My Stats</h2>
            </div>
            <div className="w-16 h-1 rounded-full bg-gradient-to-r from-blue-500 to-blue-700" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Current Streak Card */}
            <motion.div 
              className="bg-gray-700/50 rounded-lg p-4 backdrop-blur-sm border border-white/10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-white/70 text-sm">Current Streak</p>
                  <div className="flex items-baseline mt-1">
                    <h3 className="text-3xl font-bold text-white">
                      {stats.current_streak}
                    </h3>
                    <span className="text-white/50 ml-2">days</span>
                  </div>
                </div>
                <div className="text-3xl">🔥</div>
              </div>
              <div className="mt-2">
                <p className="text-white/50 text-sm">
                  Best: {stats.highest_streak} days
                </p>
              </div>
            </motion.div>
            
            {/* This Week Progress Card */}
            <motion.div 
              className="bg-gray-700/50 rounded-lg p-4 backdrop-blur-sm border border-white/10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-white/70 text-sm">This Week</p>
                  <div className="flex items-baseline mt-1">
                    <h3 className="text-3xl font-bold text-white">
                      {weeklyCheckins}
                    </h3>
                    <span className="text-white/50 ml-2">/ {goal}</span>
                  </div>
                </div>
                <div className="text-3xl">🏋️‍♂️</div>
              </div>
              {/* Progress Bar */}
              <div className="mt-4">
                <div className="h-2 bg-gray-600 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-red-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((weeklyCheckins / goal) * 100, 100)}%` }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  />
                </div>
                <p className="text-white/50 text-xs mt-2">
                  {percent}% of weekly goal
                </p>
                {/* Simple Goal Input */}
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-white/50 text-xs">Goal:</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={goal}
                    onChange={e => {
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      const numValue = parseInt(value) || 0;
                      if (numValue >= 0 && numValue <= 100) {
                        setGoal(numValue);
                      }
                    }}
                    onBlur={e => {
                      const value = parseInt(e.target.value) || 0;
                      if (value < 1) setGoal(1);
                      if (value > 100) setGoal(100);
                    }}
                    className="w-16 px-2 py-1 rounded bg-gray-600 text-white border border-gray-500 focus:outline-none focus:ring-1 focus:ring-red-500 text-center text-sm"
                    placeholder="5"
                  />
                </div>
              </div>
            </motion.div>
            
            {/* Monthly Check-ins Card */}
            <motion.div 
              className="bg-gray-700/50 rounded-lg p-4 backdrop-blur-sm border border-white/10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">This Month</p>
                  <h3 className="text-3xl font-bold text-white mt-1">
                    {stats.monthly_check_ins}
                  </h3>
                  <p className="text-white/50 text-sm mt-1">Check-ins</p>
                </div>
                <div className="text-3xl">📅</div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default MemberStats; 