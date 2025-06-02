const dotenv = require ('dotenv');
dotenv.config({ path: '../.env' }); // adjust path as needed
const { google } = require('googleapis');

//console.log("GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID);

const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "https://developers.google.com/oauthplayground"
);

const SCOPES = ["https://www.googleapis.com/auth/gmail.send"];

async function getRefreshToken() {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });

  //console.log("Go to this URL to authorize the app:\n", authUrl);
}

getRefreshToken();
