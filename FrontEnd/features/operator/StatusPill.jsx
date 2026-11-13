import { formatEnum } from "../../services/enumApi";
import styles from "./operator.module.css";

// Coloured status label; text always present so colour is never the only cue.
export default function StatusPill({ status }) {
  if (!status) return null;
  return <span className={`${styles.pill} ${styles[`s_${status}`] || ""}`}>{formatEnum(status)}</span>;
}
