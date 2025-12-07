import { getSession } from "next-auth/react";
import SquarePaymentPage from "../components/SquarePaymentPage";

export default function SquarePaymentSSRWrapper(props) {
  return <SquarePaymentPage {...props} />;
}

export async function getServerSideProps(context) {
  const session = await getSession(context);

  // Not logged in → redirect to login page
  if (!session) {
    return {
      redirect: {
        destination: "/signin", // adjust if your login route differs
        permanent: false,
      },
    };
  }

  // Logged in but OTP not verified → redirect to OTP verification page
  if (!session.user?.otpVerified) {
    return {
      redirect: {
        destination: "/verifyotp", // adjust if your route differs
        permanent: false,
      },
    };
  }

  return {
    props: {
      session,
    },
  };
}
