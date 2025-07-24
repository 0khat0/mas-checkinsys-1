import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { isValidUUID, getApiUrl, clearMemberData, getTorontoTime, getTorontoDateString, getMondayOfCurrentWeekToronto } from './utils';
import QRCodeGenerator from './QRCodeGenerator';

interface MemberStats {
  monthly_check_ins: number;
  current_streak: number;
  highest_streak: number;
  member_since: string;
  check_in_dates?: string[];
  name?: string;
  email?: string;
  barcode?: string;
}

interface FamilyMember {
  id: string;
  name: string;
  email: string;
  is_deleted: boolean;
  deleted_at?: string;
}

interface Props {
  memberId: string;
}

const DEFAULT_GOAL = 3;

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
  
  // Family member states
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>(memberId);
  const [isFamily, setIsFamily] = useState(false);
  // const familyLoading = useState(false)[0]; // Unused, comment out for now
  // const familyError = useState('')[0]; // Unused, comment out for now
  const [familyFetchComplete, setFamilyFetchComplete] = useState(false);

  // Add member form state
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [addMemberError, setAddMemberError] = useState("");
  const [addMemberLoading, setAddMemberLoading] = useState(false);

  // Declare selectedMember early to prevent initialization errors
  const selectedMember = familyMembers.find(m => m.id === selectedMemberId);

  useEffect(() => {
    // Check if this is a family account
    const savedFamilyMembers = localStorage.getItem('family_members');
    if (savedFamilyMembers) {
      try {
        const members = JSON.parse(savedFamilyMembers);
        setIsFamily(members.length > 1);
      } catch (e) {
        console.error('Error parsing family members:', e);
      }
    }

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
        console.log('Member stats data:', data); // Debug log
        console.log('Barcode from API:', data.barcode); // Debug log
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

  // On profile page load, always fetch latest family members and update state
  useEffect(() => {
    const fetchAndSyncFamilyMembers = async () => {
      const memberEmail = localStorage.getItem('member_email');
      console.log('Profile Debug: Starting family fetch', {
        memberEmail,
        memberId,
        localStorage_member_id: localStorage.getItem('member_id')
      });
      if (memberEmail) {
        const API_URL = getApiUrl();
        try {
          const response = await fetch(`${API_URL}/family/members/${encodeURIComponent(memberEmail)}`);
          if (response.ok) {
            const data = await response.json();
            setFamilyMembers(data || []);
            // Update localStorage with current family members
            const memberNames = data.map((m: any) => m.name);
            localStorage.setItem('family_members', JSON.stringify(memberNames));
            // If only one member, switch to single-user mode
            setIsFamily((data || []).length > 1);
          }
        } catch (e) {
          // Ignore errors
        } finally {
          setFamilyFetchComplete(true);
        }
      } else {
        // No email found, mark fetch as complete so we can show appropriate error
        setFamilyFetchComplete(true);
      }
    };
    fetchAndSyncFamilyMembers();
  }, []);

  // After fetching family members, handle the case where there are no members left
  useEffect(() => {
    // Only check for "no members" after family fetch is complete
    if (familyFetchComplete && familyMembers.length === 0) {
      // Clear localStorage and prompt user to check in again
      localStorage.removeItem('member_id');
      localStorage.removeItem('family_members');
      localStorage.removeItem('member_email');
      setError('No members found. Please check in or register again.');
    } else if (familyMembers.length > 0 && (!selectedMemberId || !familyMembers.find(m => m.id === selectedMemberId))) {
      // If selectedMemberId is invalid, select the first available member
      setSelectedMemberId(familyMembers[0].id);
      setEditName(familyMembers[0].name);
      setEditEmail(familyMembers[0].email);
    }
  }, [familyMembers, selectedMemberId, familyFetchComplete]);

  // const fetchFamilyMembers = async () => { // Unused, comment out for now
  //   setFamilyLoading(true); // Unused, comment out for now
  //   setFamilyError(''); // Unused, comment out for now
  //   try { // Unused, comment out for now
  //     const API_URL = getApiUrl(); // Unused, comment out for now
  //     const memberEmail = localStorage.getItem('member_email'); // Unused, comment out for now
  //     if (!memberEmail) { // Unused, comment out for now
  //       setFamilyError('No email found. Please check in again.'); // Unused, comment out for now
  //       return; // Unused, comment out for now
  //     } // Unused, comment out for now

  //     const response = await fetch(`${API_URL}/family/members/${encodeURIComponent(memberEmail)}`); // Unused, comment out for now
  //     if (response.ok) { // Unused, comment out for now
  //       const data = await response.json(); // Unused, comment out for now
  //       setFamilyMembers(data || []); // Unused, comment out for now
  //       // Update localStorage with current family members // Unused, comment out for now
  //       const memberNames = data.map((m: FamilyMember) => m.name); // Unused, comment out for now
  //       localStorage.setItem('family_members', JSON.stringify(memberNames)); // Unused, comment out for now
  //     } else { // Unused, comment out for now
  //       setFamilyError('Failed to load family members.'); // Unused, comment out for now
  //     } // Unused, comment out for now
  //   } catch (error) { // Unused, comment out for now
  //     console.error('Error fetching family members:', error); // Unused, comment out for now
  //     setFamilyError('Network error loading family members.'); // Unused, comment out for now
  //   } finally { // Unused, comment out for now
  //     setFamilyLoading(false); // Unused, comment out for now
  //     setFamilyFetchComplete(true); // Unused, comment out for now
  //   } // Unused, comment out for now
  // }; // Unused, comment out for now

  // Fetch stats for selected member
  useEffect(() => {
    if (selectedMemberId && selectedMemberId !== memberId) {
      fetchMemberStats(selectedMemberId);
    }
  }, [selectedMemberId]);

  const fetchMemberStats = async (memberIdToFetch: string) => {
    try {
      const API_URL = getApiUrl();
      const response = await fetch(`${API_URL}/member/${memberIdToFetch}/stats`);
      
      if (response.ok) {
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
            const checkinDateString = d.split('T')[0];
            return checkinDateString >= mondayString && checkinDateString <= todayString;
          }).length;
          setWeeklyCheckins(weekCheckins);
        } else {
          setWeeklyCheckins(0);
        }
      } else {
        setError('Failed to load member stats.');
      }
    } catch (error) {
      console.error('Error fetching member stats:', error);
      setError('Network error. Please try again.');
    }
  };

  const handleMemberUpdate = async (memberIdToUpdate: string, name: string, email: string) => {
    setEditError('');
    setEditSuccess('');
    try {
      const API_URL = getApiUrl();
      const res = await fetch(`${API_URL}/member/${memberIdToUpdate}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      
      if (res.ok) {
        setEditSuccess('Profile updated successfully!');
        setEditMode(false);
        setStats((prev) => prev ? { ...prev, name, email } : prev);
        
        // Update family members list if this is a family
        if (isFamily) {
          setFamilyMembers(prev => prev.map(member => 
            member.id === memberIdToUpdate 
              ? { ...member, name, email }
              : member
          ));
        }
        
        // Update localStorage email if this is the main member
        if (memberIdToUpdate === memberId) {
          localStorage.setItem("member_email", email);
        }
      } else {
        const data = await res.json();
        setEditError(data.detail || 'Failed to update profile.');
      }
    } catch (err) {
      setEditError('Network error. Please try again.');
    }
  };

  // const handleMemberDelete = async (memberIdToDelete: string) => { // Unused, comment out for now
  //   try { // Unused, comment out for now
  //     const API_URL = getApiUrl(); // Unused, comment out for now
  //     const res = await fetch(`${API_URL}/member/${memberIdToDelete}`, { // Unused, comment out for now
  //       method: "DELETE", // Unused, comment out for now
  //     }); // Unused, comment out for now
  //     if (res.ok) { // Unused, comment out for now
  //       setEditSuccess('Member removed successfully!'); // Unused, comment out for now
  //       // Refresh family members // Unused, comment out for now
  //       await fetchFamilyMembers(); // Unused, comment out for now
  //       // If only one member left, update isFamily // Unused, comment out for now
  //       const updatedMembers = familyMembers.filter(m => m.id !== memberIdToDelete && !m.is_deleted); // Unused, comment out for now
  //       setIsFamily(updatedMembers.length > 1); // Unused, comment out for now
  //       // If we deleted the currently selected member, switch to another member // Unused, comment out for now
  //       if (selectedMemberId === memberIdToDelete) { // Unused, comment out for now
  //         const activeMembers = updatedMembers; // Unused, comment out for now
  //         if (activeMembers.length > 0) { // Unused, comment out for now
  //           setSelectedMemberId(activeMembers[0].id); // Unused, comment out for now
  //         } // Unused, comment out for now
  //       } // Unused, comment out for now
  //     } else { // Unused, comment out for now
  //       const data = await res.json(); // Unused, comment out for now
  //       setEditError(data.detail || 'Failed to remove member.'); // Unused, comment out for now
  //     } // Unused, comment out for now
  //   } catch (err) { // Unused, comment out for now
  //     setEditError('Network error. Please try again.'); // Unused, comment out for now
  //   } // Unused, comment out for now
  // }; // Unused, comment out for now

  // const handleMemberRestore = async (memberIdToRestore: string) => { // Unused, comment out for now
  //   try { // Unused, comment out for now
  //     const API_URL = getApiUrl(); // Unused, comment out for now
  //     const res = await fetch(`${API_URL}/member/${memberIdToRestore}/restore`, { // Unused, comment out for now
  //       method: "POST", // Unused, comment out for now
  //     }); // Unused, comment out for now
      
  //     if (res.ok) { // Unused, comment out for now
  //       setEditSuccess('Member restored successfully!'); // Unused, comment out for now
  //       // Update family members list // Unused, comment out for now
  //       setFamilyMembers(prev => prev.map(member =>  // Unused, comment out for now
  //         member.id === memberIdToRestore  // Unused, comment out for now
  //           ? { ...member, is_deleted: false, deleted_at: undefined } // Unused, comment out for now
  //           : member // Unused, comment out for now
  //       )); // Unused, comment out for now
  //     } else { // Unused, comment out for now
  //       const data = await res.json(); // Unused, comment out for now
  //       setEditError(data.detail || 'Failed to restore member.'); // Unused, comment out for now
  //     } // Unused, comment out for now
  //   } catch (err) { // Unused, comment out for now
  //     setEditError('Network error. Please try again.'); // Unused, comment out for now
  //   } // Unused, comment out for now
  // }; // Unused, comment out for now

  // Add member handler
  const handleAddMember = async () => {
    setAddMemberError("");
    if (!/^\s*\S+\s+\S+/.test(newMemberName.trim())) {
      setAddMemberError("Please enter a full name (first and last). ");
      return;
    }
    setAddMemberLoading(true);
    try {
      const API_URL = getApiUrl();
      // Always use the current member_email for new members
      const memberEmail = localStorage.getItem("member_email");
      if (!memberEmail) {
        setAddMemberError("No family email found. Please check in again.");
        setAddMemberLoading(false);
        return;
      }
      const res = await fetch(`${API_URL}/member`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: memberEmail, name: newMemberName.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setShowAddMember(false);
        setNewMemberName("");
        setAddMemberError("");
        // Add the new member to familyMembers state
        const newMember = {
          id: data.id,
          name: newMemberName.trim(),
          email: memberEmail,
          is_deleted: false
        };
        setFamilyMembers(prev => [...prev, newMember]);
        // If now 2+ members, switch to family mode
        if (familyMembers.length + 1 > 1) setIsFamily(true);
      } else {
        const err = await res.json();
        setAddMemberError(err.detail || "Failed to add member.");
      }
    } catch {
      setAddMemberError("Network error. Please try again.");
    } finally {
      setAddMemberLoading(false);
    }
  };

  useEffect(() => {
    localStorage.setItem('checkin_goal', goal.toString());
  }, [goal]);

  // When switching selectedMemberId, update editName and editEmail to match the selected member
  useEffect(() => {
    if (selectedMember) {
      setEditName(selectedMember.name || '');
      setEditEmail(selectedMember.email || '');
    }
  }, [selectedMemberId, familyMembers]);

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
  const activeMembers = familyMembers.filter(m => !m.is_deleted);
  // const deletedMembers = familyMembers.filter(m => m.is_deleted); // Unused, comment out for now

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-black via-gray-900 to-black font-poppins overflow-x-hidden py-8">
      <div className="max-w-3xl mx-auto flex flex-col gap-8 px-2 sm:px-0">
        {/* QR Code Section */}
        <div className="flex justify-center">
          {(() => {
            let qrData = null;
            if (isFamily && familyMembers.length > 1) {
              qrData = {
                type: "family",
                email: stats.email,
                members: familyMembers.map(m => ({ name: m.name, barcode: (m as any).barcode })),
              };
            } else if (stats.barcode && stats.email) {
              qrData = {
                type: "member",
                barcode: stats.barcode,
                email: stats.email,
                name: stats.name,
              };
            }
            return qrData ? (
              <QRCodeGenerator data={qrData} />
            ) : (
              <div className="text-gray-400">No QR code available</div>
            );
          })()}
        </div>

        {/* Stats Section */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-white text-2xl">📊</span>
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-wide drop-shadow">My Stats</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Current Streak Card */}
            <div className="bg-[#181c23] border border-gray-700 rounded-2xl shadow-xl p-6 flex flex-col items-center justify-center hover:scale-105 transition-transform duration-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-3xl text-red-600">🔥</span>
                <span className="text-lg font-bold text-white">Streak</span>
              </div>
              <div className="text-4xl font-extrabold text-white mb-1">{stats.current_streak}</div>
              <div className="text-xs text-red-400">Best: {stats.highest_streak} days</div>
            </div>
            {/* This Week Progress Card */}
            <div className="bg-[#181c23] border border-gray-700 rounded-2xl shadow-xl p-6 flex flex-col items-center justify-center hover:scale-105 transition-transform duration-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-3xl text-red-600">🏋️‍♂️</span>
                <span className="text-lg font-bold text-white">This Week</span>
              </div>
              <div className="text-4xl font-extrabold text-white mb-1">{weeklyCheckins}</div>
              <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden my-2">
                <div className="h-full bg-gradient-to-r from-red-600 to-red-400 rounded-full" style={{ width: `${Math.min((weeklyCheckins / goal) * 100, 100)}%` }} />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setGoal(Math.max(1, goal - 1))}
                  className="w-7 h-7 rounded-full bg-red-900 text-white font-bold text-lg flex items-center justify-center shadow hover:bg-red-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-400"
                  disabled={goal <= 1}
                >
                  -
                </button>
                <span className="text-white font-semibold text-lg">Goal: {goal}</span>
                <button
                  type="button"
                  onClick={() => setGoal(Math.min(7, goal + 1))}
                  className="w-7 h-7 rounded-full bg-red-900 text-white font-bold text-lg flex items-center justify-center shadow hover:bg-red-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-400"
                  disabled={goal >= 7}
                >
                  +
                </button>
              </div>
              <div className="text-xs text-red-400 mt-1">{percent}% of goal</div>
            </div>
            {/* Monthly Check-ins Card */}
            <div className="bg-[#181c23] border border-gray-700 rounded-2xl shadow-xl p-6 flex flex-col items-center justify-center hover:scale-105 transition-transform duration-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-3xl text-red-600">📅</span>
                <span className="text-lg font-bold text-white">This Month</span>
              </div>
              <div className="text-4xl font-extrabold text-white mb-1">{stats.monthly_check_ins}</div>
              <div className="text-xs text-red-400">Check-ins</div>
            </div>
          </div>
        </div>

        {/* Profile Section */}
        <div className="relative z-20 -mt-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-white text-2xl">👤</span>
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-wide drop-shadow">{isFamily ? `${selectedMember?.name || 'Member'}'s Profile` : 'My Profile'}</h2>
          </div>
          <div className="bg-[#181c23] border border-gray-700 rounded-2xl shadow-2xl p-8 flex flex-col gap-6 items-center -mt-4">
            {editMode ? (
              <form
                className="space-y-4 w-full max-w-xl"
                onSubmit={async (e) => {
                  e.preventDefault();
                  await handleMemberUpdate(selectedMemberId, editName, editEmail);
                }}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">Full Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg bg-gray-900 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
                      placeholder="Enter your full name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">Email Address</label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={e => setEditEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg bg-gray-900 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-2 justify-center">
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
                    className="bg-gray-800 hover:bg-gray-700 text-red-200 font-semibold px-6 py-3 rounded-lg transition-colors duration-200"
                    onClick={() => { 
                      setEditMode(false); 
                      setEditError(''); 
                      setEditSuccess('');
                      setEditName(stats.name || '');
                      setEditEmail(stats.email || '');
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4 w-full max-w-xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">Full Name</label>
                    <input
                      type="text"
                      value={editName}
                      readOnly
                      className="w-full px-4 py-3 rounded-lg bg-gray-900 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200 opacity-70 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">Email Address</label>
                    <input
                      type="email"
                      value={editEmail}
                      readOnly
                      className="w-full px-4 py-3 rounded-lg bg-gray-900 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200 opacity-70 cursor-not-allowed"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors duration-200 flex items-center gap-2"
                  onClick={() => setEditMode(true)}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Edit Profile
                </button>
              </div>
            )}
            {editError && (
              <div className="mt-4 p-3 bg-red-900/40 border border-red-700 rounded-lg text-red-200 text-sm">
                {editError}
              </div>
            )}
            {editSuccess && (
              <div className="mt-4 p-3 bg-green-900/40 border border-green-700 rounded-lg text-green-200 text-sm">
                {editSuccess}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MemberStats; 