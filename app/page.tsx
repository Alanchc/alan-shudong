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
    href: "/feed",
    name: "动态",
    desc: "看看好友最近写了什么，公开和仅好友可见的日记都会出现在这里。",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5v5l3 2" />
        <path d="M4.5 12h2M17.5 12h2" />
      </svg>
    ),
  },
  {
    href: "/chat",
    name: "消息",
    desc: "和好友一对一聊天，未读提醒，发出去的消息可撤回。",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M4 5.5h16v11h-9l-4.5 3.5v-3.5H4z" />
        <path d="M8 9.5h8M8 12.5h5" />
      </svg>
    ),
  },
  {
    href: "/friends",
    name: "好友",
    desc: "按用户名加好友，同意申请后即可查看好友的主页与动态。",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="9" cy="8" r="3.4" />
        <path d="M2.8 19a6.2 6.2 0 0112.4 0" />
        <path d="M16 5.4a3.4 3.4 0 010 6.4M17.5 13.4a6.2 6.2 0 013.7 5.6" />
      </svg>
    ),
  },
  {
    href: "/notices",
    name: "通知",
    desc: "管理员发布的全站公告，重要消息都在这里。",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M12 4a5.5 5.5 0 015.5 5.5v3.2l1.5 2.8H5l1.5-2.8V9.5A5.5 5.5 0 0112 4z" />
        <path d="M9.5 17a2.5 2.5 0 005 0" />
      </svg>
    ),
  },
  {
    href: "/me",
    name: "我的",
    desc: "用户名、头像、简介，以及日记统计与主题设置。",
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
