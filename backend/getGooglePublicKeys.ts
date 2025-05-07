// // Define the type for Google's JWKs (JSON Web Key)
// interface GooglePublicKey {
//   kid: string; // Key ID
//   alg: string; // Algorithm (e.g., "RS256")
//   use: string; // Public key use ("sig" for signature)
//   n: string; // Modulus
//   e: string; // Exponent
// }

// // Cache for public keys to avoid redundant network requests
// let cachedKeys: GooglePublicKey[] | null = null;
// let lastFetchTime = 0;

// // Constants for key fetching
// const GOOGLE_KEYS_URL = "https://www.googleapis.com/oauth2/v3/certs";
// const CACHE_EXPIRATION_MS = 60 * 60 * 1000; // 1 hour

// /**
//  * Fetch Google's public keys (JWKs) and cache them for reuse.
//  * 
//  * @returns {Promise<GooglePublicKey[]>} A list of public keys.
//  */
// export default async function getGooglePublicKeys(): Promise<GooglePublicKey[]> {
//   const currentTime = Date.now();

//   // Use cached keys if available and not expired
//   if (cachedKeys && currentTime - lastFetchTime < CACHE_EXPIRATION_MS) {
//     return cachedKeys;
//   }

//   try {
//     // Fetch keys from Google's endpoint
//     const response = await fetch(GOOGLE_KEYS_URL);
//     const data: any = await response.json();

//     if (response.status === 200 && data && data.keys) {
//       const keys: GooglePublicKey[] = data.keys;
//       cachedKeys = keys; // Cache the keys
//       lastFetchTime = currentTime; // Update the fetch time
//       return keys;
//     } else {
//       throw new Error("Failed to fetch Google public keys");
//     }
//   } catch (error) {
//     console.error("Error fetching Google public keys:", error);
//     throw new Error("Unable to retrieve Google public keys");
//   }
// }
