import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { format, subDays, subMonths, subYears, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

interface DailyCheckin {
  checkin_id: string;
  email: string;
  name: string;
  timestamp: string;
}

interface Member {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'year' | 'custom'>('week');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month' | 'year'>('day');
  const [checkinData, setCheckinData] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [todayCheckins, setTodayCheckins] = useState<DailyCheckin[]>([]);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem('admin_token');
    if (storedToken) {
      setToken(storedToken);
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    // Set initial date range
    updateDateRange(dateRange);
    // Fetch today's check-ins
    fetchTodayCheckins();
  }, []);

  useEffect(() => {
    if (dateRange !== 'custom') {
      updateDateRange(dateRange);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchCheckinData();
    fetchStats();
  }, [startDate, endDate, groupBy]);

  const fetchTodayCheckins = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
      const response = await fetch(`${API_URL}/admin/checkins/today`);
      const data = await response.json();
      setTodayCheckins(data);
    } catch (error) {
      console.error('Error fetching today\'s check-ins:', error);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/Toronto'
    });
  };

  const updateDateRange = (range: 'week' | 'month' | 'year' | 'custom') => {
    const now = new Date();
    switch (range) {
      case 'week':
        setStartDate(startOfWeek(now));
        setEndDate(endOfWeek(now));
        setGroupBy('day');
        break;
      case 'month':
        setStartDate(startOfMonth(now));
        setEndDate(endOfMonth(now));
        setGroupBy('day');
        break;
      case 'year':
        setStartDate(startOfYear(now));
        setEndDate(endOfYear(now));
        setGroupBy('month');
        break;
    }
  };

  const fetchCheckinData = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
      const response = await fetch(
        `${API_URL}/admin/checkins/range?start_date=${format(startDate, 'yyyy-MM-dd')}&end_date=${format(endDate, 'yyyy-MM-dd')}&group_by=${groupBy}`
      );
      const data = await response.json();
      setCheckinData(data);
    } catch (error) {
      console.error('Error fetching check-in data:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
      const response = await fetch(`${API_URL}/admin/checkins/stats`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchMembers = async () => {
    setIsLoadingMembers(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
      const response = await fetch(`${API_URL}/members`);
      const data = await response.json();
      setMembers(data);
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
      const res = await fetch(`${API_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('admin_token', data.token);
        setToken(data.token);
        setIsAuthenticated(true);
        setLoginError('');
      } else {
        setLoginError('Incorrect password.');
      }
    } catch (err) {
      setLoginError('Network error.');
    }
  };

  // Helper to add Authorization header to all admin fetches
  const authFetch = (url: string, options: any = {}) => {
    return fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: token ? `Bearer ${token}` : '',
      },
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900">
        <motion.form
          className="bg-gray-800 rounded-xl p-8 shadow-2xl w-full max-w-sm flex flex-col items-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          onSubmit={handleLogin}
        >
          <h2 className="text-2xl font-bold text-white mb-6">Admin Login</h2>
          <input
            type="password"
            placeholder="Enter admin password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-gray-900 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
            autoFocus
          />
          {loginError && <p className="text-red-500 mb-4">{loginError}</p>}
          <button
            type="submit"
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
          >
            Login
          </button>
        </motion.form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 p-4 pb-24">
      <div className="max-w-7xl mx-auto space-y-6">
        <motion.h1 
          className="text-3xl md:text-4xl font-bold text-white mb-8 text-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Admin Dashboard
        </motion.h1>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div onClick={() => {
            setShowMembersModal(true);
            fetchMembers();
          }}>
            <StatsCard
              title="Total Members"
              value={stats?.total_members}
              subtitle="All time"
              icon="👥"
              clickable={true}
            />
          </div>
          <StatsCard
            title="Check-ins Today"
            value={stats?.checkins_today}
            subtitle="Today's total"
            icon="📅"
          />
          <StatsCard
            title="Total Check-ins"
            value={stats?.total_checkins}
            subtitle="All time"
            icon="🏆"
          />
        </div>

        {/* Members Modal */}
        <AnimatePresence>
          {showMembersModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowMembersModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-gray-900 rounded-xl shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden"
                onClick={e => e.stopPropagation()}
              >
                <div className="p-6 border-b border-white/10 flex justify-between items-center">
                  <h2 className="text-2xl font-semibold text-white">Member List</h2>
                  <button
                    onClick={() => setShowMembersModal(false)}
                    className="text-white/60 hover:text-white transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="p-6 overflow-auto max-h-[calc(80vh-80px)]">
                  {isLoadingMembers ? (
                    <div className="flex justify-center items-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left py-3 px-4 text-white/70 font-medium">Name</th>
                          <th className="text-left py-3 px-4 text-white/70 font-medium">Email</th>
                          <th className="text-left py-3 px-4 text-white/70 font-medium">Joined</th>
                        </tr>
                      </thead>
                      <tbody>
                        {members.map((member) => (
                          <tr 
                            key={member.id}
                            className="border-b border-white/5 hover:bg-white/5 transition-colors"
                          >
                            <td className="py-3 px-4 text-white/90 font-medium">{member.name}</td>
                            <td className="py-3 px-4 text-white/90">{member.email}</td>
                            <td className="py-3 px-4 text-white/90">{formatDate(member.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Today's Check-ins Table */}
        <motion.div 
          className="glass-card p-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h2 className="text-xl font-semibold text-white mb-6">Today's Check-ins</h2>
          <div className="overflow-x-auto">
            {todayCheckins.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-white/70 text-lg">No check-ins yet today</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-white/70 font-medium">Time</th>
                    <th className="text-left py-3 px-4 text-white/70 font-medium">Name</th>
                    <th className="text-left py-3 px-4 text-white/70 font-medium">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {[...todayCheckins].reverse().map((checkin) => (
                    <tr 
                      key={checkin.checkin_id}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="py-3 px-4 text-white/90">{formatTime(checkin.timestamp)}</td>
                      <td className="py-3 px-4 text-white/90 font-medium">{checkin.name}</td>
                      <td className="py-3 px-4 text-white/90">{checkin.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </motion.div>

        {/* Date Range Controls */}
        <motion.div 
          className="glass-card p-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="flex flex-wrap gap-4 mb-4">
            <button
              onClick={() => setDateRange('week')}
              className={`button-primary ${dateRange === 'week' ? 'bg-red-600' : ''}`}
            >
              This Week
            </button>
            <button
              onClick={() => setDateRange('month')}
              className={`button-primary ${dateRange === 'month' ? 'bg-red-600' : ''}`}
            >
              This Month
            </button>
            <button
              onClick={() => setDateRange('year')}
              className={`button-primary ${dateRange === 'year' ? 'bg-red-600' : ''}`}
            >
              This Year
            </button>
            <button
              onClick={() => setDateRange('custom')}
              className={`button-primary ${dateRange === 'custom' ? 'bg-red-600' : ''}`}
            >
              Custom Range
            </button>
          </div>

          {dateRange === 'custom' && (
            <div className="flex flex-wrap gap-4 mb-4">
              <input
                type="date"
                value={format(startDate, 'yyyy-MM-dd')}
                onChange={(e) => setStartDate(new Date(e.target.value))}
                className="input-field"
              />
              <input
                type="date"
                value={format(endDate, 'yyyy-MM-dd')}
                onChange={(e) => setEndDate(new Date(e.target.value))}
                className="input-field"
              />
            </div>
          )}

          <div className="flex gap-4">
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as 'day' | 'week' | 'month' | 'year')}
              className="input-field"
            >
              <option value="day">Group by Day</option>
              <option value="week">Group by Week</option>
              <option value="month">Group by Month</option>
              <option value="year">Group by Year</option>
            </select>
          </div>
        </motion.div>

        {/* Check-in Chart */}
        <motion.div 
          className="glass-card p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <h2 className="text-xl font-semibold text-white mb-6">Check-in Trends</h2>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={checkinData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis 
                  dataKey="date" 
                  stroke="rgba(255,255,255,0.5)"
                  tickFormatter={(date) => format(new Date(date), groupBy === 'year' ? 'yyyy' : groupBy === 'month' ? 'MMM yyyy' : 'MMM d')}
                />
                <YAxis stroke="rgba(255,255,255,0.5)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                  }}
                  labelFormatter={(date) => format(new Date(date), 'PPP')}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="Check-ins"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function StatsCard({ 
  title, 
  value, 
  subtitle, 
  icon,
  clickable = false 
}: { 
  title: string; 
  value?: number; 
  subtitle: string; 
  icon: string;
  clickable?: boolean;
}) {
  return (
    <motion.div
      className={`glass-card p-6 ${clickable ? 'cursor-pointer hover:bg-white/5' : ''}`}
      whileHover={{ scale: clickable ? 1.02 : 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 10 }}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg text-white/70">{title}</h3>
          <p className="text-3xl font-bold text-white mt-2">{value ?? '...'}</p>
          <p className="text-sm text-white/50 mt-1">{subtitle}</p>
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </motion.div>
  );
}

export default AdminDashboard; 