// frontend/app/register/page.jsx
import RegisterForm from "@/components/RegisterForm";

export const metadata = {
  title: "Create Account | Ultrawave Interactive",
  description: "Create a new Ultrawave Interactive account.",
};

export default function RegisterPage() {
  return (
    <section>
      <RegisterForm />
    </section>
  );
}
