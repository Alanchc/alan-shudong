import Link from "next/link";
import { AUTHOR_NAME, SITE_DESC, SITE_NAME } from "@/lib/site";

const MODULES = [
  {
    href: "/diary",
    name: "日记",
    desc: "写下今天，按时间轴回顾，支持标签、图片与只读分享。",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M8 7h8M8 11h8M8 15h5" />
      </svg>
    ),
  },
  {
    href: "/me",
    name: "我的",
    desc: "账号信息、日记统计与主题设置。",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="12" cy="8" r="4" />
        <path d="M4.5 20a7.5 7.5 0 0115 0" />
      </svg>
    ),
  },
];

export default function PortalPage() {
  return (
    <div className="portal">
      <div className="portal-inner">
        <div className="portal-brand">
          <span className="logo">树</span>
          <div>
            <h1 className="portal-title">{SITE_NAME}</h1>
            <p className="portal-desc">{SITE_DESC}</p>
          </div>
        </div>

        <div className="module-grid">
          {MODULES.map((item) => (
            <Link key={item.href} href={item.href} className="module-card">
              <span className="module-icon">{item.icon}</span>
              <div className="module-body">
                <div className="module-name">{item.name}</div>
                <div className="module-desc">{item.desc}</div>
              </div>
              <span className="module-arrow">→</span>
            </Link>
          ))}

          <div className="module-card module-card-off">
            <span className="module-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
            <div className="module-body">
              <div className="module-name">更多功能</div>
              <div className="module-desc">待办、笔记、工具……陆续加进来。</div>
            </div>
          </div>
        </div>

        <div className="portal-foot">
          <Link href="/login" className="link-btn">
            登录 / 注册
          </Link>
          <span>·</span>
          <span>由 {AUTHOR_NAME} 维护</span>
        </div>
      </div>
    </div>
  );
}
