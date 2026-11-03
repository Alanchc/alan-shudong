import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SITE_DESC, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: SITE_NAME,
  description: SITE_DESC,
};

export const viewport: Viewport = {
  themeColor: "#6d4aff",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var m=localStorage.getItem('diary:theme');if(m==='light'||m==='dark'){document.documentElement.dataset.theme=m}}catch(e){}",
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
