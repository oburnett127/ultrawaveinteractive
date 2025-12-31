import { getSession } from "next-auth/react";
import Protected from "../../components/Protected";
import Dashboard from "../../components/Dashboard";

export default function DashboardPage({ session }) {
  return (
    <Protected>
      <main id="main-content">
        <Dashboard session={session} />
      </main>
    </Protected>
  );
}

// 🚀 Server-side route guard (login required, OTP not required)
export async function getServerSideProps(context) {
  const session = await getSession(context);

  // Not logged in → redirect to Sign In
  if (!session) {
    return {
      redirect: {
        destination: "/signin",
        permanent: false,
      },
    };
  }

  // Logged-in users can always see dashboard — even if OTP not verified
  // (Locked features will redirect them to /verifyotp when clicked)
  return {
    props: {
      session,
    },
  };
}