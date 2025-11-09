import { useState } from "react";

export default function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [status, setStatus] = useState({ error: "", success: "" });

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/+$/, "") || "";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ error: "", success: "" });

    try {
      const res = await fetch(`${backendUrl}/api/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) {
        setStatus({ error: data.error || "Something went wrong." });
      } else {
        setStatus({ success: data.message });
        setCurrentPassword("");
        setNewPassword("");
      }
    } catch (err) {
      console.error(err);
      setStatus({ error: "Server error, please try again later." });
    }
  };

  return (
    <div className="container">
      <h2>Change Password</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Current Password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </div>

        <div>
          <label>New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit">Update Password</button>
      </form>

      {status.error && <p className="error">{status.error}</p>}
      {status.success && <p className="success">{status.success}</p>}
    </div>
  );
}
