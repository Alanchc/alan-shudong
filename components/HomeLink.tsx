import Link from "next/link";
import type { CSSProperties } from "react";

export default function HomeLink({ style }: { style?: CSSProperties }) {
  return (
    <Link href="/" className="home-link" style={style} aria-label="返回首页">
      <svg
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M15 6l-6 6 6 6" />
      </svg>
      首页
    </Link>
  );
}
