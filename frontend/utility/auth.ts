import axios from 'axios';

export async function refreshIdToken(refreshToken: any) {
    try {
      const response = await axios.post("https://oauth2.googleapis.com/token", {
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      });
  
      const tokens = response.data;
  
      return {
        idToken: tokens.id_token,
        idTokenExpires: Date.now() + tokens.expires_in * 1000,
        refreshToken: tokens.refresh_token || refreshToken, // Keep using the same refresh token if not updated
      };
    } catch (error: any) {
      console.error("Error refreshing ID token:", error.response?.data || error.message);
      throw new Error("Failed to refresh ID token");
    }
  }