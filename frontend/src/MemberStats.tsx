import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

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

function getMondayOfCurrentWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
  return new Date(d.setDate(diff));
}

function MemberStats({ memberId }: Props) {
  const [stats, setStats] = useState<MemberStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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
    const fetchStats = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
        const response = await fetch(`${API_URL}/member/${memberId}/stats`);
        const data = await response.json();
        setStats(data);
        setEditName(data.name || '');
        setEditEmail(data.email || '');
        if (data && data.check_in_dates && Array.isArray(data.check_in_dates)) {
          const now = new Date();
          const monday = getMondayOfCurrentWeek(now);
          const weekCheckins = data.check_in_dates.filter((d: string) => {
            const date = new Date(d);
            return date >= monday && date <= now;
          }).length;
          setWeeklyCheckins(weekCheckins);
        } else {
          setWeeklyCheckins(0);
        }
      } catch (error) {
        console.error('Error fetching member stats:', error);
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

  if (!stats) {
    return null;
  }

  const percent = Math.round((weeklyCheckins / goal) * 100);

  return (
    <div className="bg-gray-900 rounded-xl p-6 space-y-6">
      {/* Editable Profile Info */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
        {editMode ? (
          <form
            className="flex flex-col md:flex-row gap-2 w-full"
            onSubmit={async (e) => {
              e.preventDefault();
              setEditError('');
              setEditSuccess('');
              try {
                const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
                const res = await fetch(`${API_URL}/member/${memberId}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ name: editName, email: editEmail }),
                });
                if (res.ok) {
                  setEditSuccess('Profile updated!');
                  setEditMode(false);
                  setStats((prev) => prev ? { ...prev, name: editName, email: editEmail } : prev);
                  localStorage.setItem("member_email", editEmail);
                } else {
                  const data = await res.json();
                  setEditError(data.detail || 'Failed to update profile.');
                }
              } catch (err) {
                setEditError('Network error.');
              }
            }}
          >
            <input
              type="text"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              className="px-3 py-2 rounded bg-gray-800 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Full Name"
              required
            />
            <input
              type="email"
              value={editEmail}
              onChange={e => setEditEmail(e.target.value)}
              className="px-3 py-2 rounded bg-gray-800 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Email"
              required
            />
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded transition-colors duration-200"
            >
              Save
            </button>
            <button
              type="button"
              className="bg-gray-700 hover:bg-gray-800 text-white font-semibold px-4 py-2 rounded transition-colors duration-200"
              onClick={() => { setEditMode(false); setEditError(''); setEditSuccess(''); }}
            >
              Cancel
            </button>
          </form>
        ) : (
          <div className="flex flex-col md:flex-row md:items-center gap-2 w-full">
            <div className="flex-1">
              <div className="text-white text-lg font-semibold">{stats.name}</div>
              <div className="text-white/70 text-sm">{stats.email}</div>
            </div>
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded transition-colors duration-200"
              onClick={() => setEditMode(true)}
            >
              Edit
            </button>
          </div>
        )}
      </div>
      {editError && <div className="text-red-500 text-sm mb-2">{editError}</div>}
      {editSuccess && <div className="text-green-500 text-sm mb-2">{editSuccess}</div>}
      <h2 className="text-2xl font-bold text-white mb-4">Your Stats</h2>
      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
        <label className="text-white/70 text-sm flex items-center gap-2">
          Weekly Goal:
          <input
            type="number"
            min={1}
            max={100}
            value={goal}
            onChange={e => setGoal(Number(e.target.value))}
            className="w-16 px-2 py-1 rounded bg-gray-800 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </label>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Weekly Check-ins Card */}
        <motion.div 
          className="bg-gray-800/50 rounded-lg p-4 backdrop-blur-sm border border-white/10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/70 text-sm">This Week</p>
              <h3 className="text-3xl font-bold text-white mt-1">
                {weeklyCheckins}
              </h3>
              <p className="text-white/50 text-sm mt-1">Check-ins</p>
            </div>
            <div className="text-3xl">🏋️‍♂️</div>
          </div>
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
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
          </div>
        </motion.div>
        {/* Streak Card */}
        <motion.div 
          className="bg-gray-800/50 rounded-lg p-4 backdrop-blur-sm border border-white/10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
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
            <div className="flex justify-between items-center">
              <p className="text-white/70 text-sm">Highest Streak</p>
              <p className="text-white font-semibold">
                {stats.highest_streak} days
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default MemberStats; 