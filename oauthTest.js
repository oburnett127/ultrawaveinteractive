import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config();

const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

async function testOAuth() {
  try {
    //console.log("Testing OAuth credentials...");

    oAuth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });

    const accessToken = await oAuth2Client.getAccessToken();
    //console.log("Access Token:", accessToken.token);
    //console.log("OAuth setup is working correctly.");
  } catch (error) {
    console.error("Error Details:");
    console.error("Message:", error.message);
    console.error("Full Error:", error.response?.data || error);
  }
}

testOAuth();
