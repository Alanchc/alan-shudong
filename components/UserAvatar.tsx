"use client";

import { mediaUrl } from "@/lib/supabase";

export type AvatarPerson = {
  username: string;
  nickname: string | null;
  avatarUrl: string | null;
};

export function personName(person: AvatarPerson) {
  return person.nickname || person.username;
}

export default function UserAvatar({
  person,
  size = 40,
}: {
  person: AvatarPerson;
  size?: number;
}) {
  const style = { width: size, height: size, fontSize: Math.round(size / 2.6) };
  const src = mediaUrl(person.avatarUrl);
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="avatar" src={src} alt={personName(person)} style={style} />;
  }
  return (
    <div className="avatar avatar-fallback" style={style}>
      {personName(person).slice(0, 1).toUpperCase()}
    </div>
  );
}
