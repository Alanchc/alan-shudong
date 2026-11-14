import Link from "next/link";
import HomeLink from "@/components/HomeLink";

export default function OfflinePage() {
  return (
    <div className="profile-page">
      <div className="profile-inner">
        <div className="page-nav">
          <HomeLink />
        </div>
        <div className="profile-empty">
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: "var(--text)" }}>
            网络似乎断开了
          </div>
          <div>连上网络后重新打开即可继续写日记</div>
          <Link
            href="/"
            style={{ display: "inline-block", marginTop: 14, color: "var(--brand)", fontSize: 13 }}
          >
            重试
          </Link>
        </div>
      </div>
    </div>
  );
}
