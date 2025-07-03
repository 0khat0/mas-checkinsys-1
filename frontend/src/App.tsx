import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import MemberCheckin from "./MemberCheckin";
import AdminDashboard from "./AdminDashboard";
import './App.css'

function App() {
  return (
    <Router>
      <nav className="p-4 flex gap-4">
        <Link to="/checkin">Member Check-In</Link>
        <Link to="/admin">Admin Dashboard</Link>
      </nav>
      <Routes>
        <Route path="/checkin" element={<MemberCheckin />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="*" element={<div>404 Not Found</div>} />
      </Routes>
    </Router>
  );
}

export default App;
