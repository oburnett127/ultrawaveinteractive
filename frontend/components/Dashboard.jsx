import styles from "./Dashboard.jsx";

export default function Dashboard() {
  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>Dashboard</h1>

      <div style={styles.buttonContainer}>
        <button
          style={styles.button}
          onClick={() => window.location.href = "/squarepaymentpage"}
        >
          Make Payment
        </button>

        <button
          style={styles.button}
          onClick={() => window.location.href = "/account/change-password"}
        >
          Change Password
        </button>
      </div>
    </div>
  );
}