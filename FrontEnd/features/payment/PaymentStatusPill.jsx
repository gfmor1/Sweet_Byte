import { formatEnum } from "../../services/enumApi";
import styles from "./payment.module.css";

// Text is always shown so colour is never the only cue.
export default function PaymentStatusPill({ status }) {
  if (!status) return null;
  return <span className={`${styles.pill} ${styles[`s_${status}`] || ""}`}>{formatEnum(status)}</span>;
}
