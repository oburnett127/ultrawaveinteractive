// pages/payment.jsx
import dynamic from "next/dynamic";
import PaymentPageInner from "../components/PaymentPageInner"; // move your component code there (below)

export default dynamic(() => Promise.resolve(PaymentPageInner), { ssr: false });