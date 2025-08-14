import React, { useState } from "react";
import { signIn } from "next-auth/react";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    try {
      const r = await signIn("credentials", {
        email,
        password,
        redirect: true,
        callbackUrl: "/verifyotp", // lands here after password login
      });
      // If redirect is true, NextAuth will navigate; no need to handle r
    } catch {
      setMsg({ type: "error", text: "Sign-in failed." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: "2rem auto", padding: "1rem" }}>
      <h1>Sign in</h1>
      <form onSubmit={onSubmit}>
        <label style={{ display: "block", marginTop: 16 }}>
          Email
          <input value={email} onChange={(e)=>setEmail(e.target.value)} type="email" required style={{ width:"100%", padding:8, marginTop:6 }} />
        </label>
        <label style={{ display: "block", marginTop: 16 }}>
          Password
          <input value={password} onChange={(e)=>setPassword(e.target.value)} type="password" required style={{ width:"100%", padding:8, marginTop:6 }} />
        </label>
        {msg && (
          <div role="alert" style={{ marginTop: 12, padding:"8px 12px", background:"#ffe8e8", border:"1px solid #ffb3b3" }}>
            {msg.text}
          </div>
        )}
        <button type="submit" disabled={busy} style={{ marginTop: 14, padding:"10px 14px" }}>
          {busy ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}
