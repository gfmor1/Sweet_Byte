import styles from "./customer.module.css";

// No image data exists for menu items, so pick an emoji by keyword.
const RULES = [
  [/cookie/i, "🍪", "#fdecc8"],
  [/donut|doughnut/i, "🍩", "#fde0ec"],
  [/gelato|ice ?cream|sorbet|sundae/i, "🍨", "#dff1fb"],
  [/waffle/i, "🧇", "#fbe9cf"],
  [/brownie/i, "🍫", "#ead9cf"],
  [/macaron/i, "🍬", "#f3e0fa"],
  [/tiramisu/i, "🍮", "#f3e8d6"],
  [/tart|\bpie\b/i, "🥧", "#fbe4d2"],
  [/chocolate/i, "🍫", "#ead9cf"],
  [/roll/i, "🥐", "#fbebd0"],
  [/cake|cheesecake|cupcake/i, "🍰", "#fde3ea"],
];

export function thumbFor(name = "") {
  for (const [pattern, emoji, bg] of RULES) {
    if (pattern.test(name)) return { emoji, bg };
  }
  return { emoji: "🧁", bg: "#fde8f3" };
}

export default function MenuThumb({ name }) {
  const { emoji, bg } = thumbFor(name);

  return (
    <span className={styles.thumb} style={{ background: bg }} aria-hidden="true">
      {emoji}
    </span>
  );
}
