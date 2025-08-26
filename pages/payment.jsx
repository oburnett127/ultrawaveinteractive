// pages/payment.jsx
import dynamic from "next/dynamic";
import PaymentPageInner from "../components/PaymentPageInner";

export default dynamic(() => Promise.resolve(PaymentPageInner), { ssr: false });
