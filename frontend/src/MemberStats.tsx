import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { isValidUUID, getApiUrl, clearMemberData, getTorontoTime, getTorontoDateString, getMondayOfCurrentWeekToronto } from './utils';

interface MemberStats {
  monthly_check_ins: number;
  current_streak: number;
  highest_streak: number;
  member_since: string;
  check_in_dates?: string[];
  name?: string;
  email?: string;
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
  const [familyLoading, setFamilyLoading] = useState(false);
  const [familyError, setFamilyError] = useState('');
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

  const fetchFamilyMembers = async () => {
    setFamilyLoading(true);
    setFamilyError('');
    try {
      const API_URL = getApiUrl();
      const memberEmail = localStorage.getItem('member_email');
      if (!memberEmail) {
        setFamilyError('No email found. Please check in again.');
        return;
      }

      const response = await fetch(`${API_URL}/family/members/${encodeURIComponent(memberEmail)}`);
      if (response.ok) {
        const data = await response.json();
        setFamilyMembers(data || []);
        // Update localStorage with current family members
        const memberNames = data.map((m: FamilyMember) => m.name);
        localStorage.setItem('family_members', JSON.stringify(memberNames));
      } else {
        setFamilyError('Failed to load family members.');
      }
    } catch (error) {
      console.error('Error fetching family members:', error);
      setFamilyError('Network error loading family members.');
    } finally {
      setFamilyLoading(false);
      setFamilyFetchComplete(true);
    }
  };

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

  const handleMemberDelete = async (memberIdToDelete: string) => {
    try {
      const API_URL = getApiUrl();
      const res = await fetch(`${API_URL}/member/${memberIdToDelete}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setEditSuccess('Member removed successfully!');
        // Refresh family members
        await fetchFamilyMembers();
        // If only one member left, update isFamily
        const updatedMembers = familyMembers.filter(m => m.id !== memberIdToDelete && !m.is_deleted);
        setIsFamily(updatedMembers.length > 1);
        // If we deleted the currently selected member, switch to another member
        if (selectedMemberId === memberIdToDelete) {
          const activeMembers = updatedMembers;
          if (activeMembers.length > 0) {
            setSelectedMemberId(activeMembers[0].id);
          }
        }
      } else {
        const data = await res.json();
        setEditError(data.detail || 'Failed to remove member.');
      }
    } catch (err) {
      setEditError('Network error. Please try again.');
    }
  };

  const handleMemberRestore = async (memberIdToRestore: string) => {
    try {
      const API_URL = getApiUrl();
      const res = await fetch(`${API_URL}/member/${memberIdToRestore}/restore`, {
        method: "POST",
      });
      
      if (res.ok) {
        setEditSuccess('Member restored successfully!');
        // Update family members list
        setFamilyMembers(prev => prev.map(member => 
          member.id === memberIdToRestore 
            ? { ...member, is_deleted: false, deleted_at: undefined }
            : member
        ));
      } else {
        const data = await res.json();
        setEditError(data.detail || 'Failed to restore member.');
      }
    } catch (err) {
      setEditError('Network error. Please try again.');
    }
  };

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
        setShowAddMember(false);
        setNewMemberName("");
        setAddMemberError("");
        // Refresh family members and update state instantly
        await fetchFamilyMembers();
        // If now 2+ members, switch to family mode
        const updatedMembers = familyMembers.length + 1; // optimistic
        if (updatedMembers > 1) setIsFamily(true);
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
  const deletedMembers = familyMembers.filter(m => m.is_deleted);

  return (
    <div className="min-h-screen w-full bg-gray-900 font-poppins overflow-x-hidden">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Family Member Selection */}
        {isFamily && (
          <motion.div
            className="bg-gray-800/50 rounded-xl p-6 backdrop-blur-sm border border-white/10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mb-6 flex flex-col items-start">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-lg">👨‍👩‍👧‍👦</span>
                </div>
                <h2 className="text-2xl font-extrabold text-white">Family Members</h2>
              </div>
              <div className="w-16 h-1 rounded-full bg-gradient-to-r from-purple-500 to-purple-700" />
            </div>
            {/* Add Member Button and Form */}
            <div className="mb-4">
              {showAddMember ? (
                <form
                  className="flex flex-col sm:flex-row gap-2 items-center"
                  onSubmit={e => { e.preventDefault(); handleAddMember(); }}
                >
                  <input
                    className="input-field flex-1"
                    placeholder="Enter new member's full name"
                    type="text"
                    value={newMemberName}
                    onChange={e => setNewMemberName(e.target.value)}
                    required
                    disabled={addMemberLoading}
                  />
                  <button
                    type="submit"
                    className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors duration-200"
                    disabled={addMemberLoading}
                  >
                    {addMemberLoading ? "Adding..." : "Add"}
                  </button>
                  <button
                    type="button"
                    className="bg-gray-600 hover:bg-gray-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors duration-200"
                    onClick={() => { setShowAddMember(false); setNewMemberName(""); setAddMemberError(""); }}
                    disabled={addMemberLoading}
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <button
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors duration-200"
                  onClick={() => setShowAddMember(true)}
                >
                  + Add Member
                </button>
              )}
              {addMemberError && <div className="text-red-400 mt-2 text-sm">{addMemberError}</div>}
            </div>
            
            {familyLoading ? (
              <div className="flex justify-center items-center h-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
              </div>
            ) : familyError ? (
              <div className="text-red-400 text-center">{familyError}</div>
            ) : (
              <div className="space-y-4">
                {/* Active Members */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Active Members</h3>
                  {/* Family Members Box (first box): selectable cards, no delete buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {activeMembers.map((member) => (
                      <button
                        key={member.id}
                        onClick={() => setSelectedMemberId(member.id)}
                        className={`p-3 rounded-lg border-2 transition-all duration-200 text-left ${
                          selectedMemberId === member.id
                            ? 'border-purple-500 bg-purple-500/20'
                            : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
                        }`}
                      >
                        <div className="text-white font-medium">{member.name}</div>
                        <div className="text-white/60 text-sm">{member.email}</div>
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Deleted Members (if any) */}
                {deletedMembers.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-white/70 mb-3">Removed Members</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {deletedMembers.map((member) => (
                        <div
                          key={member.id}
                          className="p-3 rounded-lg border-2 border-gray-600 bg-gray-700/30 text-left opacity-60"
                        >
                          <div className="text-white/70 font-medium">{member.name}</div>
                          <div className="text-white/40 text-sm">{member.email}</div>
                          <button
                            onClick={() => handleMemberRestore(member.id)}
                            className="mt-2 text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded transition-colors"
                          >
                            Restore
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* Profile Section */}
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
              <h2 className="text-2xl font-extrabold text-white">
                {isFamily ? `${selectedMember?.name || 'Member'}'s Profile` : 'My Profile'}
              </h2>
            </div>
            <div className="w-16 h-1 rounded-full bg-gradient-to-r from-red-500 to-red-700" />
          </div>
          
          {editMode ? (
            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                await handleMemberUpdate(selectedMemberId, editName, editEmail);
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
            <div className="bg-gray-800/50 rounded-xl p-6 backdrop-blur-sm border border-white/10">
              <div className="mb-6 flex flex-col items-start">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-extrabold text-white">
                    {isFamily ? `${selectedMember?.name || 'Member'}'s Profile` : 'My Profile'}
                  </h2>
                </div>
                <div className="w-16 h-1 rounded-full bg-gradient-to-r from-red-500 to-red-700" />
              </div>
              <form
                className="space-y-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  await handleMemberUpdate(selectedMemberId, editName, editEmail);
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
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors duration-200 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Save Changes
                  </button>
                  {activeMembers.length > 1 && (
                    <button
                      type="button"
                      className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors duration-200 flex items-center gap-2"
                      onClick={async () => {
                        await handleMemberDelete(selectedMemberId);
                        // After delete, select the next available member
                        const updatedMembers = familyMembers.filter(m => m.id !== selectedMemberId && !m.is_deleted);
                        if (updatedMembers.length > 0) {
                          setSelectedMemberId(updatedMembers[0].id);
                          setEditName(updatedMembers[0].name);
                          setEditEmail(updatedMembers[0].email);
                        }
                      }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete Member
                    </button>
                  )}
                </div>
              </form>
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
              <h2 className="text-2xl font-extrabold text-white">
                {isFamily ? `${selectedMember?.name || 'Member'}'s Stats` : 'My Stats'}
              </h2>
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
                {/* Weekly Goal Input */}
                <div className="mt-3">
                  <div className="mb-2">
                    <span className="text-white/50 text-xs">Weekly Goal:</span>
                  </div>
                  <div className="flex items-center gap-2 w-full justify-center">
                    <button
                      type="button"
                      onClick={() => setGoal(Math.max(1, goal - 1))}
                      className="w-8 h-8 rounded-full bg-gray-600 hover:bg-gray-500 text-white font-bold text-lg flex items-center justify-center transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                      disabled={goal <= 1}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      max="7"
                      value={goal}
                      onChange={e => {
                        const value = parseInt(e.target.value) || 1;
                        const clampedValue = Math.max(1, Math.min(7, value));
                        setGoal(clampedValue);
                      }}
                      onBlur={e => {
                        const value = parseInt(e.target.value) || 1;
                        const clampedValue = Math.max(1, Math.min(7, value));
                        setGoal(clampedValue);
                      }}
                      className="w-12 px-2 py-1 rounded bg-gray-600 text-white border border-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 text-center text-sm font-semibold"
                      style={{ WebkitAppearance: 'none', MozAppearance: 'textfield' }}
                    />
                    <button
                      type="button"
                      onClick={() => setGoal(Math.min(7, goal + 1))}
                      className="w-8 h-8 rounded-full bg-gray-600 hover:bg-gray-500 text-white font-bold text-lg flex items-center justify-center transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                      disabled={goal >= 7}
                    >
                      +
                    </button>
                  </div>
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