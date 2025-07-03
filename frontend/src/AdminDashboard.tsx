import { useEffect, useState } from "react";

type Checkin = {
  checkin_id: string;
  member_id: string;
  name: string;
  timestamp: string;
};

export default function AdminDashboard() {
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/admin/checkins/today")
      .then((res) => res.json())
      .then((data) => {
        setCheckins(data);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="w-full max-w-2xl p-6 bg-white rounded shadow">
        <h2 className="text-3xl font-bold mb-6 text-center text-red-700">Today's Check-Ins</h2>
        {loading ? (
          <p className="text-center text-black">Loading...</p>
        ) : checkins.length === 0 ? (
          <p className="text-center text-black">No check-ins yet today.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border border-red-700 rounded">
              <thead className="bg-red-700 text-white">
                <tr>
                  <th className="border border-red-700 px-3 py-2">Time</th>
                  <th className="border border-red-700 px-3 py-2">Member ID</th>
                  <th className="border border-red-700 px-3 py-2">Name</th>
                </tr>
              </thead>
              <tbody>
                {checkins.map((c) => (
                  <tr key={c.checkin_id} className="even:bg-gray-100">
                    <td className="border border-red-700 px-3 py-2 text-black">
                      {new Date(c.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="border border-red-700 px-3 py-2 text-black">{c.member_id}</td>
                    <td className="border border-red-700 px-3 py-2 text-black">{c.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
} 