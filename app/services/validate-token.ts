import { NextApiRequest, NextApiResponse } from "next";
import jwt from "jsonwebtoken";
import fetch from "node-fetch";

// URL to fetch Google's public keys
const GOOGLE_PUBLIC_KEYS_URL = "https://www.googleapis.com/oauth2/v3/certs";

// Type for Google public key response
interface GooglePublicKey {
  kid: string; // Key ID
  n: string;   // Public key (modulus)
  alg: string; // Algorithm used
}

interface GooglePublicKeysResponse {
  keys: GooglePublicKey[]; // Array of public keys
}

// Fetch Google public keys for token validation
const getGooglePublicKeys = async (): Promise<GooglePublicKey[]> => {
  const response = await fetch(GOOGLE_PUBLIC_KEYS_URL);

  if (!response.ok) {
    throw new Error("Failed to fetch Google public keys");
  }

  // Type the data returned by response.json() as GooglePublicKeysResponse
  const data: GooglePublicKeysResponse = await response.json() as GooglePublicKeysResponse;

  return data.keys; // Return the `keys` array
};

// Validate the Google ID token
const validateIdToken = async (idToken: string): Promise<any> => {
  const publicKeys = await getGooglePublicKeys();

  // Decode the token header to find the key ID (kid)
  const decodedHeader = jwt.decode(idToken, { complete: true }) as { header: { kid: string } } | null;

  if (!decodedHeader || !decodedHeader.header.kid) {
    throw new Error("Invalid token header");
  }

  const key = publicKeys.find((k) => k.kid === decodedHeader.header.kid);
  if (!key) {
    throw new Error("Invalid token key");
  }

  // Verify the token
  const verifiedPayload = jwt.verify(idToken, key.n, { algorithms: ["RS256"] });
  return verifiedPayload; // Contains user info (email, sub, etc.)
};

// API Route Handler
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ error: "ID token is required" });
  }

  try {
    const user = await validateIdToken(idToken);
    return res.status(200).json({ success: true, user });
  } catch (error) {
    console.error(error);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
