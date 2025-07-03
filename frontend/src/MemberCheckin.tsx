import { useEffect, useState } from "react";

function MemberCheckin() {
  const [memberId, setMemberId] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "register" | "checking-in" | "success" | "error">("loading");
  const [message, setMessage] = useState<string>("");
  const [formId, setFormId] = useState("");
  const [formName, setFormName] = useState("");

  useEffect(() => {
    const savedId = localStorage.getItem("member_id");
    if (savedId) {
      setMemberId(savedId);
      setStatus("checking-in");
    } else {
      setStatus("register");
    }
  }, []);

  useEffect(() => {
    if (status === "checking-in" && memberId) {
      fetch("http://127.0.0.1:8000/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member_id: memberId }),
      })
        .then(async (res) => {
          if (res.ok) {
            setStatus("success");
            setMessage("Check-in successful! Welcome back.");
          } else {
            const data = await res.json();
            setStatus("error");
            setMessage(data.detail || "Check-in failed.");
          }
        })
        .catch(() => {
          setStatus("error");
          setMessage("Network error. Please try again.");
        });
    }
  }, [status, memberId]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md p-6 bg-white rounded shadow">
        <h1 className="text-2xl font-bold mb-4 text-center">Muay Thai Gym Check-In</h1>
        {status === "checking-in" && (
          <p className="text-center text-gray-600">Checking you in...</p>
        )}
        {status === "success" && (
          <p className="text-center text-green-600">{message}</p>
        )}
        {status === "error" && (
          <p className="text-center text-red-600">{message}</p>
        )}
        {status === "register" && (
          <form
            className="flex flex-col gap-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setStatus("loading");
              setMessage("");
              const res = await fetch("http://127.0.0.1:8000/member", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ member_id: formId, name: formName }),
              });
              if (res.ok) {
                localStorage.setItem("member_id", formId);
                setMemberId(formId);
                const checkinRes = await fetch("http://127.0.0.1:8000/checkin", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ member_id: formId }),
                });
                if (checkinRes.ok) {
                  setStatus("success");
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
            }}
          >
            <input
              className="border p-2 rounded"
              placeholder="Member ID (from NFC/QR)"
              value={formId}
              onChange={(e) => setFormId(e.target.value)}
              required
            />
            <input
              className="border p-2 rounded"
              placeholder="Full Name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              required
            />
            <button
              className="bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
              type="submit"
            >
              Register & Check In
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default MemberCheckin; 