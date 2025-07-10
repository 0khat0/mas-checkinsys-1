import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import logo from "./assets/mas-logo.png";
import { isValidUUID, getApiUrl, clearMemberData } from "./utils";

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
  // Use the day of the year to pick a message
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  return messages[dayOfYear % messages.length];
}

function MemberCheckin() {
  const [memberEmail, setMemberEmail] = useState<string | null>(null);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "register" | "checking-in" | "success" | "error">("loading");
  const [message, setMessage] = useState<string>("");
  const [formEmail, setFormEmail] = useState("");
  const [formName, setFormName] = useState("");

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-red-950 font-poppins overflow-hidden">
      <div className="w-full p-4 px-2 sm:px-4 flex flex-col items-center justify-center min-h-[100vh] relative">
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
        
        {/* Main Card */}
        <motion.div 
          className="card w-full flex flex-col items-center px-6 py-8 space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
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
              <div className="h-2 rounded-full bg-gradient-to-r from-red-500 to-red-700 shadow-md mt-2 w-full" />
            </div>
          </motion.div>
          
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
                    className="glass-card bg-green-500/10 p-6 text-center"
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  >
                    <p className="text-xl font-semibold text-green-400">✓ {message}</p>
                    <p className="mt-2 text-lg text-white/90 font-medium">{getDailyMuayThaiMessage()}</p>
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

          {/* Registration Form */}
          <AnimatePresence>
            {status === "register" && (
              <motion.form
                className="w-full max-w-md space-y-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                onSubmit={async (e) => {
                  e.preventDefault();
                  setStatus("loading");
                  setMessage("");
                  try {
                    const API_URL = getApiUrl();
                    const res = await fetch(`${API_URL}/member`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ email: formEmail, name: formName }),
                    });
                    if (res.ok) {
                      const data = await res.json();
                      localStorage.setItem("member_email", formEmail);
                      setMemberEmail(formEmail);
                      
                      // Store member_id if it's a valid UUID
                      if (data.id && isValidUUID(data.id)) {
                        setMemberId(data.id);
                      }
                      
                      const checkinRes = await fetch(`${API_URL}/checkin`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email: formEmail }),
                      });
                      if (checkinRes.ok) {
                        const checkinData = await checkinRes.json();
                        // Update member_id from check-in response if available
                        if (checkinData.member_id && isValidUUID(checkinData.member_id)) {
                          setMemberId(checkinData.member_id);
                        }
                        setStatus("success");
                        setMessage("Check-in successful! Welcome!");
                      } else {
                        const checkinErrorData = await checkinRes.json();
                        setStatus("error");
                        setMessage(checkinErrorData.detail || "Check-in failed after registration.");
                      }
                    } else {
                      const data = await res.json();
                      setStatus("error");
                      setMessage(data.detail || "Registration failed.");
                    }
                  } catch (error) {
                    setStatus("error");
                    setMessage("Network error. Please try again.");
                  }
                }}
              >
                <div className="glass-card space-y-6 p-6">
                  <motion.div 
                    className="space-y-2"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <label className="block text-lg font-medium text-white/90">Full Name</label>
                    <input
                      className="input-field"
                      placeholder="Enter your name"
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      required
                    />
                  </motion.div>

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
                    className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-3 px-6 rounded-lg font-semibold hover:from-red-700 hover:to-red-800 transition-all duration-300 shadow-lg hover:shadow-red-500/30"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                  >
                    Register & Check In
                  </motion.button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Member Stats */}
          <AnimatePresence>
            {/* Stats have been moved to the Profile page */}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}

export default MemberCheckin; 