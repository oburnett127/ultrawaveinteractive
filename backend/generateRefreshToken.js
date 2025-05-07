import { google } from 'googleapis';

const OAuth2 = google.auth.OAuth2;

const oauth2Client = new OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'https://developers.google.com/oauthplayground' // CHANGE THIS WHEN SWITCHING TO PRODUCTION!!!
);

// Generate an authorization URL
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://mail.google.com/'], // Gmail API scope
});

//console.log('Authorize this app by visiting this URL:', authUrl);

// After visiting the URL and authorizing, you'll get a code in the URL query
// Paste that code below
const code = process.env.GOOGLE_OAUTH_AUTHORIZATION_CODE; // Replace with the code from the URL

oauth2Client.getToken(code, (err, token) => {
  if (err) {
    return console.error('Error retrieving access token', err);
  }
  //console.log('Your refresh token is:', token?.refresh_token);
});
