// utility/auth.js

export async function refreshIdToken(refreshToken) {
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  if (!response.ok) {
    throw new Error("Failed to refresh access token");
  }

  const tokens = await response.json();

  return {
    idToken: tokens.id_token,
    idTokenExpires: Date.now() + tokens.expires_in * 1000,
    refreshToken: tokens.refresh_token ?? refreshToken, // fallback if not returned
  };
}
