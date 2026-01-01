"use client";

import { useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import CssBaseline from "@mui/material/CssBaseline";

export default function Providers({ children }) {
  /* ---------------------------------------
     Prevent flash of wrong theme
  --------------------------------------- */
  useEffect(() => {
    try {
      const saved = localStorage.getItem("uw-theme");
      if (saved) {
        document.documentElement.setAttribute("data-theme", saved);
      }
    } catch {}
  }, []);

  /* ---------------------------------------
     CookieConsent init
  --------------------------------------- */
  useEffect(() => {
    function init() {
      if (window.cookieconsent) {
        window.cookieconsent.initialise({
          palette: {
            popup: { background: "#000" },
            button: { background: "#f1d600" },
          },
          theme: "classic",
          position: "bottom",
          content: {
            message:
              "This website uses cookies to ensure you get the best experience.",
            dismiss: "Got it!",
            link: "Learn more",
            href: "/privacypolicy",
          },
        });
      }
    }

    window.addEventListener("load", init);
    return () => window.removeEventListener("load", init);
  }, []);

  return (
    <SessionProvider>
      <CssBaseline />
      {children}
    </SessionProvider>
  );
}
