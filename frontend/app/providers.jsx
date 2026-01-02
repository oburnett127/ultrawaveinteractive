"use client";

import { useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import CssBaseline from "@mui/material/CssBaseline";
import MuiCacheProvider from "../app/mui-cache";

export default function Providers({ children }) {
  useEffect(() => {
    try {
      const saved = localStorage.getItem("uw-theme");
      if (saved) {
        document.documentElement.setAttribute("data-theme", saved);
      }
    } catch {}
  }, []);

  useEffect(() => {
    let timer = setTimeout(() => {
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
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  return (
    <SessionProvider>
      <MuiCacheProvider>
        <CssBaseline />
        {children}
      </MuiCacheProvider>
    </SessionProvider>
  );
}
