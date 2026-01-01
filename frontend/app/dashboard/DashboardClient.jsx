"use client";

import Protected from "@/components/Protected";
import Dashboard from "@/components/Dashboard";

export default function DashboardClient({ session }) {
  return (
    <Protected>
      <main id="main-content">
        <Dashboard session={session} />
      </main>
    </Protected>
  );
}
