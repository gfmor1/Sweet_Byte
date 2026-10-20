import { useState } from "react";

// Feedback line under forms/dashboards: errors in red, successes in green
export function useStatus() {
  const [status, setStatus] = useState({ text: "", isError: false });
  return [
    status,
    {
      success: (text) => setStatus({ text, isError: false }),
      error: (text) => setStatus({ text, isError: true }),
      clear: () => setStatus({ text: "", isError: false })
    }
  ];
}

export function StatusMessage({ status }) {
  if (!status.text) return null;
  return (
    <p className={status.isError ? "error-message" : "success-message"} role={status.isError ? "alert" : undefined}>
      {status.text}
    </p>
  );
}
