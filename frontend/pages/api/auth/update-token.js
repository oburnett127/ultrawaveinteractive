// File: pages/api/auth/update-token.ts
import { getToken, encode } from "next-auth/jwt";

export default async (req, res) => {
  // Fetch the current token
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Update the `otpVerified` field
  token.otpVerified = true;

  //console.log('from update-token.ts, token.otpVerified: ', token.otpVerified);

  // Re-encode the updated token
  const updatedToken = await encode({
    token,
    secret: process.env.NEXTAUTH_SECRET || "",
  });

  //console.log("Encoded token in update-token:", updatedToken);

  res.setHeader("Set-Cookie", `next-auth.session-token=${updatedToken}; Path=/; HttpOnly; Secure`);
  
  // Send the updated token back to the client (optional)
  res.status(200).json({ token: updatedToken });
};
