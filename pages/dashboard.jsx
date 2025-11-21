import Protected from "../components/Protected";
import Dashboard from "../components/Dashboard";

export default function DashboardPage() {
  return (
    <Protected>
      <Dashboard />
    </Protected>
  );
}