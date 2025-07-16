import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import logo from "./assets/mas-logo.png";
import { isValidUUID, getApiUrl, clearMemberData, setMemberId, getTorontoTime } from "./utils";

function getDailyMuayThaiMessage() {
  const messages = [
    "Go smash those pads!",
    "Unleash your inner warrior!",
    "Keep your guard up and your spirit higher!",
    "Every round makes you stronger!",
    "Train hard, fight easy!",
    "Respect. Discipline. Power.",
    "Push your limits today!",
    "Channel your energy into every strike!",
    "Stay sharp, stay humble!",
    "Victory is earned in the gym!",
    "Let your kicks fly!",
    "Muay Thai: Art of Eight Limbs!",
    "Breathe, focus, conquer!",
    "You are your only competition!",
    "Make every session count!"
  ];
  // Use the day of the year to pick a message (Toronto time)
  const now = getTorontoTime();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  return messages[dayOfYear % messages.length];
}

function MemberCheckin() {
  const [memberEmail, setMemberEmail] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "register" | "checking-in" | "success" | "error">("loading");
  const [message, setMessage] = useState<string>("");
  const [formEmail, setFormEmail] = useState("");
  const [formName, setFormName] = useState("");
  const [checkinByName, setCheckinByName] = useState(false);
  const [familyNames, setFamilyNames] = useState<string[]>([]);
  const [isFamily, setIsFamily] = useState(false);
  const [familyMembers, setFamilyMembers] = useState<string[]>([]); // NEW: Store family members from localStorage
  const [selectedFamilyMembers, setSelectedFamilyMembers] = useState<string[]>([]); // NEW: Track selected members for check-in
  // Track which family members are not checked in for the current period
  const [notCheckedInMembers, setNotCheckedInMembers] = useState<string[]>([]);
  const [checkinStatusLoading, setCheckinStatusLoading] = useState(false);

  // Helper to handle name changes
  const handleFamilyNameChange = (idx: number, value: string) => {
    setFamilyNames(names => names.map((n, i) => i === idx ? value : n));
  };
  const addFamilyMember = () => setFamilyNames(names => [...names, ""]);
  const removeFamilyMember = (idx: number) => setFamilyNames(names => names.filter((_, i) => i !== idx));

  // Helper to fetch family check-in status
  const fetchFamilyCheckinStatus = async (email: string) => {
    setCheckinStatusLoading(true);
    try {
      const API_URL = getApiUrl();
      const res = await fetch(`${API_URL}/family/checkin-status/${encodeURIComponent(email)}`);
      if (res.ok) {
        const data = await res.json();
        setNotCheckedInMembers(data.not_checked_in || []);
      } else {
        setNotCheckedInMembers([]);
      }
    } catch {
      setNotCheckedInMembers([]);
    } finally {
      setCheckinStatusLoading(false);
    }
  };

  // On load, if family, fetch check-in status
  useEffect(() => {
    const savedEmail = localStorage.getItem("member_email");
    const savedMemberId = localStorage.getItem("member_id");
    const savedFamilyMembers = localStorage.getItem("family_members");

    // Validate saved member_id if it exists
    if (savedMemberId && !isValidUUID(savedMemberId)) {
      localStorage.removeItem("member_id");
    }

    if (savedEmail) {
      setMemberEmail(savedEmail);

      // Check if this is a family
      if (savedFamilyMembers) {
        try {
          const members = JSON.parse(savedFamilyMembers);
          setFamilyMembers(members);
          if (members.length > 1) {
            // Always fetch check-in status for family
            fetchFamilyCheckinStatus(savedEmail).then(() => {
              // The notCheckedInMembers state will be set by fetchFamilyCheckinStatus
            });
            setStatus("register");
            setMessage("Select which family members are here today:");
            return;
          }
        } catch (e) {
          console.error("Error parsing family members:", e);
          localStorage.removeItem("family_members");
        }
      }

      // Single member or family with only one member - proceed with auto check-in
      setStatus("checking-in");
    } else {
      setStatus("register");
    }
  }, []);

  // After successful family check-in or registration, refresh check-in status
  useEffect(() => {
    if (status === "success" && memberEmail && familyMembers.length > 1) {
      fetchFamilyCheckinStatus(memberEmail);
    }
  }, [status]);

  useEffect(() => {
    if (status === "checking-in" && memberEmail) {
      const API_URL = getApiUrl();
      fetch(`${API_URL}/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: memberEmail }),
      })
        .then(async (res) => {
          if (res.ok) {
            const data = await res.json();
            // Only store member_id if it's a valid UUID
            if (data.member_id && isValidUUID(data.member_id)) {
              setMemberId(data.member_id);
              console.log('Set member_id after check-in (useEffect):', data.member_id);
            }
            setStatus("success");
            setMessage("Check-in successful! Welcome back.");
          } else {
            const data = await res.json();
            if (data.detail === "Member not found") {
              clearMemberData();
              setStatus("register");
              setMessage("");
            } else {
              setStatus("error");
              setMessage(data.detail || "Check-in failed.");
            }
          }
        })
        .catch(() => {
          setStatus("error");
          setMessage("Network error. Please try again.");
        });
    }
  }, [status, memberEmail]);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-black via-gray-900 to-red-950 font-poppins relative overflow-hidden">
      {/* Animated background blobs */}
      <motion.div 
        className="floating-background bg-blob-1"
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 90, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear"
        }}
      />
      <motion.div 
        className="floating-background bg-blob-2"
        animate={{
          scale: [1.2, 1, 1.2],
          rotate: [90, 0, 90],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear"
        }}
      />
      {/* Unified Main Content, no extra min-h-screen, no overflow-x-hidden, no extra wrappers */}
      <div className="flex flex-col items-center justify-center w-full min-h-screen px-4 py-8 space-y-6">
        <motion.div
          className="flex flex-row items-center justify-center w-full mb-4 gap-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="bg-white rounded-2xl shadow-lg p-2 flex items-center justify-center"
               style={{ width: 120, height: 120 }}>
            <img
              src={logo}
              alt="MAS Academy Logo"
              className="object-contain h-full w-full"
              style={{ maxHeight: 110, maxWidth: 110 }}
            />
          </div>
          <div className="flex flex-col items-start justify-center w-full max-w-xs">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight drop-shadow-lg"
                style={{ textShadow: '0 2px 8px rgba(0,0,0,0.7)' }}>
              MAS Academy of Martial Arts
            </h1>
            <div className="h-2 rounded-full animated-accent-bar shadow-md mt-2 w-full" />
          </div>
        </motion.div>
        {/* Green check-in message and forms, etc. remain unchanged */}
        {/* Green check-in message for all checked in (family) */}
        {status === "register" && familyMembers.length > 1 && notCheckedInMembers.length === 0 && !checkinStatusLoading && (
          <motion.div
            className="w-full max-w-md mb-2"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="glass-card bg-gradient-to-r from-green-800 via-green-700 to-green-600 p-6 text-center">
              <p className="text-xl font-semibold text-white">✓ All family members have checked in for this period!</p>
              <p className="mt-2 text-lg text-white/90 font-medium">{getDailyMuayThaiMessage()}</p>
            </div>
          </motion.div>
        )}
        {/* Green check-in message for single users after check-in */}
        {status === "success" && (familyMembers.length <= 1 || !familyMembers.length) && (
          <motion.div
            className="w-full max-w-md mb-2"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="glass-card bg-gradient-to-r from-green-800 via-green-700 to-green-600 p-6 text-center">
              <p className="text-xl font-semibold text-white">✓ {message || "Check-in successful! Welcome back."}</p>
              <p className="mt-2 text-lg text-white/90 font-medium">{getDailyMuayThaiMessage()}</p>
            </div>
          </motion.div>
        )}
        {/* Only show forms/options if not all checked in (family) or not success (individual) */}
        {!(status === "register" && familyMembers.length > 1 && notCheckedInMembers.length === 0 && !checkinStatusLoading) && status !== "success" && (
          <>
            <motion.div
              className="w-full max-w-md mb-2"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <button
                type="button"
                className="w-full bg-gradient-to-r from-black via-gray-800 to-gray-900 border border-gray-800 rounded-lg p-3 text-white text-center text-base font-semibold focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-200"
                onClick={() => setCheckinByName((v) => !v)}
              >
                {checkinByName ? "Back to Register" : "Already Registered? Tap Here To Check In!"}
              </button>
            </motion.div>
            {/* Status Messages */}
            <AnimatePresence mode="wait">
              {(status === "checking-in" || status === "error") && (
                <motion.div 
                  className="w-full max-w-md space-y-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {status === "checking-in" && (
                    <motion.div 
                      className="glass-card flex flex-col items-center p-6"
                      animate={{ scale: [1, 1.02, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-red-500 mb-4"></div>
                      <p className="text-xl font-medium text-white/90">Checking you in...</p>
                    </motion.div>
                  )}
                  {status === "error" && (
                    <motion.div 
                      className="glass-card bg-red-500/10 p-6 text-center"
                      initial={{ scale: 0.9 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    >
                      <p className="text-xl font-semibold text-red-400">✗ {message}</p>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
            {/* Family Member Selection for Returning Families */}
            <AnimatePresence>
              {status === "register" && familyMembers.length > 1 && notCheckedInMembers.length > 0 && !checkinStatusLoading && (
                <motion.div
                  className="w-full max-w-md space-y-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="glass-card space-y-6 p-6">
                    <div className="text-center">
                      <h3 className="text-xl font-semibold text-white mb-2">👨‍👩‍��‍👦 Family Check-in</h3>
                      <p className="text-white/70 mb-4">Select which family members are here today (not yet checked in):</p>
                    </div>
                    <div className="space-y-3">
                      {notCheckedInMembers.map((memberName) => (
                        <label key={memberName} className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg hover:bg-white/5 transition-colors">
                          <input
                            type="checkbox"
                            checked={selectedFamilyMembers.includes(memberName)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedFamilyMembers(prev => [...prev, memberName]);
                              } else {
                                setSelectedFamilyMembers(prev => prev.filter(name => name !== memberName));
                              }
                            }}
                            className="w-5 h-5 text-red-600 bg-gray-700 border-gray-600 rounded focus:ring-red-500 focus:ring-2"
                          />
                          <span className="text-white font-medium">{memberName}</span>
                        </label>
                      ))}
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFamilyMembers(notCheckedInMembers); // Select all
                        }}
                        className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFamilyMembers([]); // Clear all
                        }}
                        className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                      >
                        Clear All
                      </button>
                    </div>
                    <button
                      onClick={async () => {
                        if (selectedFamilyMembers.length === 0) {
                          setMessage("Please select at least one family member.");
                          return;
                        }
                        setStatus("loading");
                        setMessage("");
                        try {
                          const API_URL = getApiUrl();
                          const checkinData = {
                            email: memberEmail!,
                            member_names: selectedFamilyMembers
                          };
                          const res = await fetch(`${API_URL}/family/checkin`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(checkinData),
                          });
                          if (res.ok) {
                            const data = await res.json();
                            setStatus("success");
                            setMessage(data.message);
                            setSelectedFamilyMembers([]);
                            // Refresh check-in status after check-in
                            await fetchFamilyCheckinStatus(memberEmail!);
                            // If there are still unchecked members, set status back to register to allow more check-ins
                            if (notCheckedInMembers.length > selectedFamilyMembers.length) {
                              setStatus("register");
                            }
                          } else {
                            const err = await res.json();
                            setStatus("error");
                            setMessage(err.detail || "Family check-in failed.");
                          }
                        } catch {
                          setStatus("error");
                          setMessage("Network error. Please try again.");
                        }
                      }}
                      disabled={selectedFamilyMembers.length === 0}
                      className="w-full bg-gradient-to-r from-red-700 via-red-500 to-pink-500 text-white py-3 px-6 rounded-lg font-semibold hover:from-pink-600 hover:to-red-700 transition-all duration-300 shadow-lg hover:shadow-black/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Check In Selected Members ({selectedFamilyMembers.length})
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {/* Registration or Check-In by Name Form */}
            <AnimatePresence>
              {status === "register" && !checkinByName && (
                <motion.form
                  className="w-full max-w-md space-y-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  onSubmit={async (e) => {
                    e.preventDefault();
                    // Validate all names
                    const allNames = [formName, ...familyNames];
                    for (const name of allNames) {
                      if (!/^\s*\S+\s+\S+/.test(name.trim())) {
                        setMessage("Please enter a full name (first and last) for each member.");
                        return;
                      }
                    }
                    if (!/^\S+@\S+\.\S+$/.test(formEmail.trim())) {
                      setMessage("Please enter a valid email address.");
                      return;
                    }
                    setStatus("loading");
                    setMessage("");
                    const API_URL = getApiUrl();
                    
                    if (isFamily && allNames.length > 1) {
                      // Use family registration endpoint
                      try {
                        const familyData = {
                          email: formEmail,
                          members: allNames.map(name => ({ name: name.trim() }))
                        };
                        
                        const res = await fetch(`${API_URL}/family/register`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(familyData),
                        });
                        
                        if (res.ok) {
                          const data = await res.json();
                          // Store family info in localStorage
                          localStorage.setItem("member_email", formEmail);
                          localStorage.setItem("family_members", JSON.stringify(allNames));
                          setMemberEmail(formEmail);
                          // NEW: Save the first member's id as member_id for profile access
                          if (data.member_ids && Array.isArray(data.member_ids) && data.member_ids.length > 0) {
                            localStorage.setItem("member_id", data.member_ids[0]);
                          }
                          setStatus("success");
                          setMessage(data.message);
                        } else {
                          const err = await res.json();
                          setStatus("error");
                          setMessage(err.detail || "Family registration failed.");
                        }
                      } catch {
                        setStatus("error");
                        setMessage("Network error. Please try again.");
                      }
                    } else {
                      // Use single member registration (existing logic)
                      let results: string[] = [];
                      for (const [idx, name] of allNames.entries()) {
                        try {
                          const res = await fetch(`${API_URL}/member`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ email: formEmail, name }),
                          });
                          if (res.ok) {
                            const data = await res.json();
                            if (idx === 0) {
                              localStorage.setItem("member_email", formEmail);
                              setMemberEmail(formEmail);
                              if (data.id && isValidUUID(data.id)) setMemberId(data.id);
                            }
                            // Check in
                            const checkinRes = await fetch(`${API_URL}/checkin`, {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ email: formEmail }),
                            });
                            if (checkinRes.ok) {
                              results.push(`${name}: Check-in confirmed`);
                            } else {
                              const err = await checkinRes.json();
                              results.push(`${name}: Check-in failed (${err.detail || "error"})`);
                            }
                          } else {
                            const err = await res.json();
                            results.push(`${name}: Registration failed (${err.detail || "error"})`);
                          }
                        } catch {
                          results.push(`${name}: Network error`);
                        }
                      }
                      setStatus("success");
                      setMessage(results.join("\n"));
                    }
                  }}
                >
                  <div className="glass-card space-y-6 p-6">
                    {/* Family Toggle */}
                    <motion.div className="flex justify-center mb-4">
                      <button
                        type="button"
                        onClick={() => setIsFamily(!isFamily)}
                        className={`px-6 py-2 rounded-full font-semibold transition-all duration-200 border-2 ${
                          isFamily 
                            ? 'bg-gray-800 text-white/70 border-gray-700 hover:bg-gray-700' 
                            : 'bg-gradient-to-r from-red-600 to-red-700 text-white border-red-600'
                        }`}
                      >
                        {isFamily ? 'Go Back' : '👨‍👩‍👧‍👦 Family'}
                      </button>
                    </motion.div>
                    
                    <motion.div className="space-y-2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                      <label className="block text-lg font-medium text-white/90">Full Name</label>
                      <input className="input-field" placeholder="Enter your full name" type="text" value={formName} onChange={e => setFormName(e.target.value)} required />
                    </motion.div>
                    
                    {/* Family member fields - only show if family mode is active */}
                    {isFamily && familyNames.map((name, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input className="input-field flex-1" placeholder="Enter family member's full name" type="text" value={name} onChange={e => handleFamilyNameChange(idx, e.target.value)} required />
                        <button type="button" className="text-red-400 font-bold px-2" onClick={() => removeFamilyMember(idx)} aria-label="Remove family member">&times;</button>
                      </div>
                    ))}
                    
                    {/* Family control buttons */}
                    {isFamily && (
                      <div className="flex gap-2">
                        <button 
                          type="button" 
                          className="flex items-center gap-1 px-3 py-2 border border-gray-700 rounded-md text-sm text-white bg-transparent hover:bg-gray-800 transition-all flex-1 justify-center" 
                          onClick={addFamilyMember}
                        >
                          <span className="text-lg font-bold">+</span> <span>Add Member</span>
                        </button>
                      </div>
                    )}
                    
                    <motion.div 
                      className="space-y-2"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <label className="block text-lg font-medium text-white/90">Email Address</label>
                      <input
                        className="input-field"
                        placeholder="Enter your email"
                        type="email"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        required
                      />
                    </motion.div>
                    <motion.button
                      className="w-full bg-gradient-to-r from-red-700 via-red-500 to-pink-500 text-white py-3 px-6 rounded-lg font-semibold hover:from-pink-600 hover:to-red-700 transition-all duration-300 shadow-lg hover:shadow-black/30"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                    >
                      {isFamily ? 'Register Family & Check In' : 'Register & Check In'}
                    </motion.button>
                  </div>
                </motion.form>
              )}
              {status === "register" && checkinByName && (
                <motion.form
                  className="w-full max-w-md space-y-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  onSubmit={async (e) => {
                    e.preventDefault();
                    // Validate all names
                    const allNames = [formName, ...familyNames];
                    for (const name of allNames) {
                      if (!/^\s*\S+\s+\S+/.test(name.trim())) {
                        setMessage("Please enter a full name (first and last) for each member.");
                        return;
                      }
                    }
                    setStatus("loading");
                    setMessage("");
                    const API_URL = getApiUrl();
                    let results: string[] = [];
                    let anyNotFound = false;
                    let firstMemberId = null;
                    let firstMemberEmail = null;
                    let isFamilyAccount = false;
                    let familyMemberNames = [];
                    for (const name of allNames) {
                      try {
                        const res = await fetch(`${API_URL}/checkin/by-name`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ name }),
                        });
                        if (res.ok) {
                          const data = await res.json();
                          results.push(`${name}: Check-in confirmed`);
                          // Save the first member's id and email for profile access
                          if (!firstMemberId && data.member_id && isValidUUID(data.member_id)) {
                            firstMemberId = data.member_id;
                          }
                          if (!firstMemberEmail && data.email) {
                            firstMemberEmail = data.email;
                          }
                        } else {
                          const data = await res.json();
                          if (data.detail === "Member not found") {
                            anyNotFound = true;
                            results.push(`${name}: Not found.`);
                          } else {
                            results.push(`${name}: Check-in failed (${data.detail || "error"})`);
                          }
                        }
                      } catch {
                        results.push(`${name}: Network error`);
                      }
                    }
                    // After all check-ins, check if this is a family account
                    if (firstMemberEmail) {
                      try {
                        const familyRes = await fetch(`${API_URL}/family/members/${encodeURIComponent(firstMemberEmail)}`);
                        if (familyRes.ok) {
                          const familyData = await familyRes.json();
                          if (Array.isArray(familyData) && familyData.length > 1) {
                            isFamilyAccount = true;
                            familyMemberNames = familyData.map((m) => m.name);
                            // Set member_id to the first member's id (primary)
                            if (familyData[0]?.id && isValidUUID(familyData[0].id)) {
                              firstMemberId = familyData[0].id;
                            }
                            // Update localStorage.family_members
                            localStorage.setItem("family_members", JSON.stringify(familyMemberNames));
                          } else {
                            // Not a family, clear family_members
                            localStorage.removeItem("family_members");
                          }
                        }
                      } catch {
                        // Ignore errors, fallback to single member
                        localStorage.removeItem("family_members");
                      }
                    }
                    // Save to localStorage if found
                    if (firstMemberId && firstMemberEmail) {
                      localStorage.setItem("member_id", firstMemberId);
                      localStorage.setItem("member_email", firstMemberEmail);
                      setMemberEmail(firstMemberEmail);
                    }
                    if (anyNotFound) {
                      setStatus("register"); // keep form open
                      setFormName("");
                      setFamilyNames([]);
                      setMessage("Name not found. Please register or re-enter your name.");
                    } else {
                      setStatus("success");
                      setMessage(results.join("\n"));
                    }
                  }}
                >
                  <div className="glass-card space-y-6 p-6">
                    {message && (<div className="text-red-400 text-center font-semibold mb-2">{message}</div>)}
                    <motion.div className="space-y-2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                      <label className="block text-lg font-medium text-white/90">Full Name</label>
                      <input className="input-field" placeholder="Enter your full name" type="text" value={formName} onChange={e => setFormName(e.target.value)} required />
                    </motion.div>
                    {/* Family member fields */}
                    {familyNames.map((name, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input className="input-field flex-1" placeholder="Enter family member's full name" type="text" value={name} onChange={e => handleFamilyNameChange(idx, e.target.value)} required />
                        <button type="button" className="text-red-400 font-bold px-2" onClick={() => removeFamilyMember(idx)} aria-label="Remove family member">&times;</button>
                      </div>
                    ))}
                    <button type="button" className="flex items-center gap-1 px-3 py-1 border border-gray-700 rounded-md text-sm text-white bg-transparent hover:bg-gray-800 transition-all" onClick={addFamilyMember}>
                      <span className="text-lg font-bold">+</span> <span>Add Family Member</span>
                    </button>
                    <motion.button
                      className="w-full bg-gradient-to-r from-red-700 via-red-500 to-pink-500 text-white py-3 px-6 rounded-lg font-semibold hover:from-pink-600 hover:to-red-700 transition-all duration-300 shadow-lg hover:shadow-black/30"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                    >
                      Check In
                    </motion.button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </>
        )}
        {/* Member Stats (moved to Profile page) */}
      </div>
    </div>
  );
}

export default MemberCheckin; 