import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import logo from "./assets/mas-logo.png";
import { isValidUUID, getApiUrl, clearMemberData, setMemberId, getTorontoTime } from "./utils";
import { useNavigate } from "react-router-dom";

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
  const [checkinByName, setCheckinByName] = useState(false); // NEW: toggle for check-in by name
  // Add state for multiple names
  const [familyNames, setFamilyNames] = useState<string[]>([]);
  const navigate = useNavigate();

  // Helper to handle name changes
  const handleFamilyNameChange = (idx: number, value: string) => {
    setFamilyNames(names => names.map((n, i) => i === idx ? value : n));
  };
  const addFamilyMember = () => setFamilyNames(names => [...names, ""]);
  const removeFamilyMember = (idx: number) => setFamilyNames(names => names.filter((_, i) => i !== idx));

  useEffect(() => {
    const savedEmail = localStorage.getItem("member_email");
    const savedMemberId = localStorage.getItem("member_id");
    
    // Validate saved member_id if it exists
    if (savedMemberId && !isValidUUID(savedMemberId)) {
      localStorage.removeItem("member_id");
    }
    
    if (savedEmail) {
      setMemberEmail(savedEmail);
      setStatus("checking-in");
    } else {
      setStatus("register");
    }
  }, []);

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
        {/* Green check-in message */}
        {status !== "success" && (
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
        )}
        {/* Status Messages */}
        <AnimatePresence mode="wait">
          {(status === "checking-in" || status === "success" || status === "error") && (
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
              {status === "success" && (
                <motion.div 
                  className="glass-card bg-gradient-to-r from-green-800 via-green-700 to-green-600 p-6 text-center"
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                >
                  <p className="text-xl font-semibold text-white">✓ {message}</p>
                  <p className="mt-2 text-lg text-white/90 font-medium">{getDailyMuayThaiMessage()}</p>
                  <button
                    className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg"
                    onClick={() => navigate('/profile')}
                  >
                    Go to Profile
                  </button>
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
                let results: string[] = [];
                // Register/check in each name
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
              }}
            >
              <div className="glass-card space-y-6 p-6">
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
                  Register & Check In
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
                for (const name of allNames) {
                  try {
                    const res = await fetch(`${API_URL}/checkin/by-name`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ name }),
                    });
                    if (res.ok) {
                      results.push(`${name}: Check-in confirmed`);
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
        {/* Member Stats (moved to Profile page) */}
      </div>
    </div>
  );
}

export default MemberCheckin; 