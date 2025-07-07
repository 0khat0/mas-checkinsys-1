import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import logo from "./assets/mas-logo.png";
import MemberStats from './MemberStats';

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
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    const savedEmail = localStorage.getItem("member_email");
    if (savedEmail) {
      setMemberEmail(savedEmail);
      setStatus("checking-in");
    } else {
      setStatus("register");
    }
  }, []);

  useEffect(() => {
    if (status === "checking-in" && memberEmail) {
      fetch("http://127.0.0.1:8000/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: memberEmail }),
      })
        .then(async (res) => {
          if (res.ok) {
            const data = await res.json();
            setMemberId(data.member_id); // Assuming the backend returns member_id
            setStatus("success");
            setShowStats(true);
            setMessage("Check-in successful! Welcome back.");
          } else {
            const data = await res.json();
            if (data.detail === "Member not found") {
              localStorage.removeItem("member_email");
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
      <div className="w-full max-w-lg p-4 flex flex-col items-center justify-center min-h-[100vh] relative">
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
          {/* Clean, Modern Banner with Stronger Shadow */}
          <motion.div 
            className="w-full flex justify-center items-center mb-3"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <img 
              src={logo} 
              alt="MAS Academy of Martial Arts Banner" 
              className="w-full max-w-3xl h-32 md:h-44 object-cover object-center rounded-2xl shadow-2xl shadow-red-900/60 bg-white"
              style={{ border: 'none' }}
            />
          </motion.div>
          
          {/* Title */}
          <motion.h1 
            className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-700 tracking-tight text-center relative z-10 text-shadow"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            MAS Academy of Martial Arts
          </motion.h1>
          
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
                    const res = await fetch("http://127.0.0.1:8000/member", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ email: formEmail, name: formName }),
                    });
                    if (res.ok) {
                      const data = await res.json();
                      localStorage.setItem("member_email", formEmail);
                      setMemberEmail(formEmail);
                      setMemberId(data.id);
                      const checkinRes = await fetch("http://127.0.0.1:8000/checkin", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email: formEmail }),
                      });
                      if (checkinRes.ok) {
                        setStatus("success");
                        setShowStats(true);
                        setMessage("Check-in successful! Welcome!");
                      } else {
                        const data = await checkinRes.json();
                        setStatus("error");
                        setMessage(data.detail || "Check-in failed after registration.");
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

                  <motion.div 
                    className="space-y-2"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
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
            {showStats && memberId && (
              <motion.div
                className="w-full"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
              >
                <MemberStats memberId={memberId} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}

export default MemberCheckin; 