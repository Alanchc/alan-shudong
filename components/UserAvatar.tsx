"use client";

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
  if (person.avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="avatar" src={person.avatarUrl} alt={personName(person)} style={style} />;
  }
  return (
    <div className="avatar avatar-fallback" style={style}>
      {personName(person).slice(0, 1).toUpperCase()}
    </div>
  );
}
