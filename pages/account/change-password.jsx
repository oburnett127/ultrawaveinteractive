import { useState, useRef, useEffect } from "react";

export default function ChangePassword() {
  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/+$/, "") || "";

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [status, setStatus] = useState({ error: "", success: "" });
  const [isLoading, setIsLoading] = useState(false);

  const abortControllerRef = useRef(null);

  // Abort any pending request on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // Basic frontend password validation (customize to your rules)
  const validatePasswords = () => {
    if (!currentPassword.trim() || !newPassword.trim()) {
      return "Both fields are required.";
    }
    if (newPassword.length < 8) {
      return "New password must be at least 8 characters.";
    }
    if (newPassword === currentPassword) {
      return "New password cannot be the same as the current password.";
    }
    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return "New password must include uppercase, lowercase, and a number.";
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ error: "", success: "" });

    const validationError = validatePasswords();
    if (validationError) {
      setStatus({ error: validationError, success: "" });
      return;
    }

    setIsLoading(true);

    // Abort any existing request before starting a new one
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch(`${backendUrl}/api/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
        credentials: "include",
        signal: controller.signal,
      });

      // Handle rate limiting gracefully
      if (res.status === 429) {
        setStatus({
          error: "Too many requests. Please wait a moment and try again.",
          success: "",
        });
        return;
      }

      const data = await res.json().catch(() => ({})); // prevent crash if invalid JSON

      if (!res.ok) {
        setStatus({
          error: data?.error || `Request failed (${res.status})`,
          success: "",
        });
      } else {
        setStatus({
          error: "",
          success: data?.message || "Password changed successfully!",
        });
        setCurrentPassword("");
        setNewPassword("");
      }
    } catch (err) {
      if (err.name === "AbortError") {
        console.warn("Password change request aborted.");
        return;
      }
      console.error("Change password error:", err);
      setStatus({
        error: "Unable to connect. Please try again later.",
        success: "",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="change-password-container">
      <h2>Change Password</h2>
      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label htmlFor="currentPassword">Current Password</label>
          <input
            id="currentPassword"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="newPassword">New Password</label>
          <input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>

        <button type="submit" disabled={isLoading}>
          {isLoading ? "Updating..." : "Update Password"}
        </button>
      </form>

      {status.error && <p className="error-msg">⚠️ {status.error}</p>}
      {status.success && <p className="success-msg">✅ {status.success}</p>}
    </div>
  );
}
