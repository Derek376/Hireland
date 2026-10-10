import type { CSSProperties } from "react";
export type IconName = "search" | "pin" | "building" | "bookmark" | "chat" | "chevron" | "arrow" | "back" | "close" | "check" | "lock" | "gift" | "file" | "sparkle" | "history" | "trash" | "like" | "dislike";
const paths: Record<IconName, React.ReactNode> = {
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></>,
  pin: <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
  building: <><path d="M5 21V3h11v18M3 21h18M16 9h4v12M8 7h1m3 0h1M8 11h1m3 0h1M8 15h1m3 0h1M10 21v-3h3v3" /></>,
  bookmark: <path d="M6 3h12v18l-6-4-6 4V3Z" />,
  chat: <path d="M21 11a9 9 0 0 1-9 9 9.6 9.6 0 0 1-4-.9L3 21l1.8-5a9 9 0 1 1 16.2-5Z" />,
  chevron: <path d="m6 9 6 6 6-6" />,
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  back: <path d="M20 12H4m6-6-6 6 6 6" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  check: <path d="m5 12 4 4L19 6" />,
  lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2" /></>,
  gift: <><path d="M3 8h18v4H3zM5 12v9h14v-9M12 8v13" /><path d="M12 8C3 8 5 1 9 3c2 1 3 5 3 5Zm0 0c9 0 7-7 3-5-2 1-3 5-3 5Z" /></>,
  file: <><path d="M5 3h10l4 4v14H5V3Zm10 0v5h4M8 12h8m-8 4h6" /></>,
  sparkle: <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z" />,
  history: <><path d="M3 11a9 9 0 1 1 2.4 7M3 4v7h7M12 7v5l3 2" /></>,
  trash: <><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7" /></>,
  like: <><path d="M7 10H3v11h4V10Zm0 10h11a2 2 0 0 0 2-1.6l1-7A2 2 0 0 0 19 9h-6l1-5a2 2 0 0 0-2-2l-5 8v10Z" /></>,
  dislike: <><path d="M7 14H3V3h4v11Zm0-10h11a2 2 0 0 1 2 1.6l1 7a2 2 0 0 1-2 2.4h-6l1 5a2 2 0 0 1-2 2l-5-8V4Z" /></>,
};
export function Icon({ name, size = 16, style }: { name: IconName; size?: number; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}>{paths[name]}</svg>;
}
