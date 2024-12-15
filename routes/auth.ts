// import express, { Request, Response } from 'express';
// import fetch from 'node-fetch';
// import { validateGoogleIdToken } from '../services/validate-token';

// // Define types for environment variables (if not using a config library)
// const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
// const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
// const REDIRECT_URI = 'http://localhost:3000/auth/google/callback'; // Replace with your redirect URI

// const router = express.Router();

// interface GoogleTokenResponse {
//   access_token: string;
//   id_token: string;
//   expires_in: number;
//   token_type: string;
//   refresh_token?: string;
// }

// // Google OAuth callback route
// router.get('/google/callback', async (req: Request, res: Response) => {
//   try {
//     const { code } = req.query;

//     if (!code || typeof code !== 'string') {
//       throw new Error('Authorization code not provided');
//     }

//     // Step 1: Exchange the authorization code for tokens
//     const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({
//         code,
//         client_id: GOOGLE_CLIENT_ID,
//         client_secret: GOOGLE_CLIENT_SECRET,
//         redirect_uri: REDIRECT_URI,
//         grant_type: 'authorization_code',
//       }),
//     });
//     const tokens = (await tokenResponse.json()) as GoogleTokenResponse;

//     if (!tokens.id_token) {
//       throw new Error('Failed to retrieve ID token');
//     }

//     // Step 2: Validate the ID token
//     const payload = await validateGoogleIdToken(tokens.id_token, GOOGLE_CLIENT_ID);

//     // Step 3: Use the payload to authenticate the user
//     const { email, name } = payload;

//     // TODO: Create or find the user in your database
//     // Example:
//     // const user = await User.findOrCreate({ email, name });

//     // Step 4: Create a session or issue your app’s own JWT
//     // Example:
//     // const appToken = createAppJwt(user);

//     res.status(200).json({ message: 'Authentication successful', user: { email, name } });
//   } catch (error) {
//     console.error(error);
//     res.status(400).json({ error: (error as Error).message });
//   }
// });

// export default router;
