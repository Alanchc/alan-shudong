"use client";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { mediaUrl } from "@/lib/supabase";

export default function MarkdownBody({ children }: { children: string }) {
  return (
    <Markdown
      remarkPlugins={[remarkGfm]}
      components={{
        img: ({ src, alt }) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mediaUrl(typeof src === "string" ? src : null) ?? undefined} alt={alt ?? ""} />
        ),
      }}
    >
      {children}
    </Markdown>
  );
}
