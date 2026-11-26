export type IconName =
  | "home"
  | "layers"
  | "equipment"
  | "recycle"
  | "wallet"
  | "send"
  | "receipt"
  | "user"
  | "menu"
  | "close"
  | "logout"
  | "leaf"
  | "mail"
  | "lock";
const paths: Record<IconName, string> = {
  home: "m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9",
  layers: "m12 3 10 5-10 5L2 8l10-5ZM2 12l10 5 10-5M2 16l10 5 10-5",
  equipment: "M3 4h18v13H3zM8 21h8m-4-4v4",
  recycle:
    "m8 4 4-2 4 7M12 2 9 8H4m16 2 2 5-7 4m7-4-7-1-2-5M12 22H6l-2-7m2 7 3-6 5 1",
  wallet: "M20 7H4V4h14v3M4 7v13h17V7H4Zm12 5h5v4h-5v-4",
  send: "m22 2-7 20-4-9L2 9 22 2ZM11 13 22 2",
  receipt: "M5 3h14v19l-3-2-4 2-4-2-3 2V3Zm4 5h6m-6 4h6m-6 4h3",
  user: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2",
  menu: "M4 6h16M4 12h16M4 18h16",
  close: "m6 6 12 12M6 18 18 6",
  logout: "M9 4H4v16h5m5-13 5 5-5 5m-5-5h14",
  leaf: "M5 20C-1 5 12 2 21 3c1 13-6 20-16 17ZM5 20 16 8m-7 8 1-7m0 6 6-1",
  mail: "M3 5h18v14H3V5Zm0 1 9 7 9-7",
  lock: "M5 10h14v11H5V10Zm3 0V6a4 4 0 0 1 8 0v4m-4 5v2",
};
export function Icon({
  name,
  className = "",
}: {
  name: IconName;
  className?: string;
}) {
  return (
    <svg
      className={`eco-icon ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={paths[name]} />
    </svg>
  );
}
