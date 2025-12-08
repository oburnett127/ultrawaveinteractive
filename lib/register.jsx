// import { useState, useRef } from "react";
// import Script from "next/script";
// import { useRouter } from "next/router";
// import Head from "next/head";
// import { getSession } from "next-auth/react";
// export default function Register() {
//   const router = useRouter();

//   const [emailText, setEmailText] = useState("");
//   const [name, setName] = useState("");
//   const [password, setPassword] = useState("");
//   const [errorMsg, setErrorMsg] = useState("");
//   const [submitting, setSubmitting] = useState(false);
//   const recaptchaReady = useRef(false);

//   const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

//   // ------------------------------------
//   // Load reCAPTCHA v3
//   // ------------------------------------
//   const getRecaptchaToken = async () => {
//     if (!window.grecaptcha || !recaptchaReady.current) {
//       setErrorMsg("reCAPTCHA is still loading. Please wait a moment.");
//       return null;
//     }

//     try {
//       return await window.grecaptcha.execute(siteKey, { action: "register" });
//     } catch (e) {
//       console.error("reCAPTCHA execute error:", e);
//       return null;
//     }
//   };

//   // ------------------------------------
//   // Handle Registration
//   // ------------------------------------
//   const handleRegister = async (e) => {
//     e.preventDefault();
//     setErrorMsg("");

//     if (!emailText.trim() || !password.trim() || !name.trim()) {
//       setErrorMsg("All fields are required.");
//       return;
//     }

//     if (password.length < 8) {
//       setErrorMsg("Password must be at least 8 characters.");
//       return;
//     }

//     if (!siteKey) {
//       setErrorMsg("Site configuration missing. Please contact support.");
//       return;
//     }

//     const recaptchaToken = await getRecaptchaToken();
//     if (!recaptchaToken) return;

//     setSubmitting(true);

//     const controller = new AbortController();
//     const timeout = setTimeout(() => controller.abort(), 10000);

//     try {
//       const res = await fetch(`/api/auth/register`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         credentials: "include",
//         signal: controller.signal,
//         body: JSON.stringify({
//           emailText,
//           password,
//           name,
//           recaptchaToken,
//         }),
//       });

//       clearTimeout(timeout);

//       if (res.status === 429) {
//         setErrorMsg("Too many requests. Please wait and try again.");
//         return;
//       }

//       const data = await res.json().catch(() => ({}));

//       if (!res.ok) {
//         throw new Error(data?.error || `Server returned ${res.status}`);
//       }

//       if (data?.success) {
//         router.push("/signin");
//       } else {
//         throw new Error(data?.error || "Unexpected server response.");
//       }
//     } catch (err) {
//       if (err.name === "AbortError") {
//         setErrorMsg("Request timed out. Please check your connection and try again.");
//       } else {
//         console.error("Registration error:", err);
//         setErrorMsg(err.message || "Registration failed. Please try again later.");
//       }
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   return (
//     <>
//       <Head>
//         <title>Create Account | Ultrawave Interactive</title>
//         <meta
//           name="description"
//           content="Create a secure account with Ultrawave Interactive Web Design."
//         />
//       </Head>

//       <main id="main-content" className="register-styling">
//         <Script
//           src={`https://www.google.com/recaptcha/api.js?render=${siteKey}`}
//           strategy="afterInteractive"
//           onLoad={() => {
//             if (window.grecaptcha) {
//               window.grecaptcha.ready(() => {
//                 recaptchaReady.current = true;
//               });
//             }
//           }}
//           onError={() =>
//             setErrorMsg("Failed to load reCAPTCHA. Please refresh and try again.")
//           }
//         />

//         <h1>Create Account</h1>

//         {!siteKey && (
//           <p className="red-text">
//             Missing NEXT_PUBLIC_RECAPTCHA_SITE_KEY — reCAPTCHA will not load.
//           </p>
//         )}

//         <form onSubmit={handleRegister} noValidate>
//           <label>
//             Full Name
//             <input
//               value={name}
//               onChange={(e) => setName(e.target.value)}
//               required
//               type="text"
//               name="name"
//               disabled={submitting}
//               autoComplete="name"
//               placeholder="Full Name"
//             />
//           </label>

//           <label>
//             Email
//             <input
//               value={emailText}
//               onChange={(e) => setEmailText(e.target.value)}
//               required
//               type="email"
//               name="email"
//               disabled={submitting}
//               autoComplete="email"
//               placeholder="Email"
//             />
//           </label>

//           <label>
//             Password
//             <input
//               value={password}
//               onChange={(e) => setPassword(e.target.value)}
//               required
//               type="password"
//               name="password"
//               disabled={submitting}
//               minLength={8}
//               autoComplete="new-password"
//               placeholder="Password"
//             />
//           </label>

//           {errorMsg && <p className="red-text">⚠️ {errorMsg}</p>}

//           <button type="submit" disabled={submitting}>
//             {submitting ? "Creating..." : "Create Account"}
//           </button>
//         </form>
//       </main>
//     </>
//   );
// }

// import { getSession } from "next-auth/react";

// export async function getServerSideProps(context) {
//   const session = await getSession(context);

//   // Not logged in → redirect to signin
//   if (!session) {
//     return {
//       redirect: {
//         destination: "/signin",
//         permanent: false,
//       },
//     };
//   }

//   // Logged in but OTP not verified → redirect to OTP step
//   if (!session.user?.otpVerified) {
//     return {
//       redirect: {
//         destination: "/verifyotp",
//         permanent: false,
//       },
//     };
//   }

//   return {
//     props: {
//       session,
//     },
//   };
// }