export type Mood = "开心" | "平静" | "低落" | "疲惫" | "兴奋";

export const MOODS: Mood[] = ["开心", "平静", "低落", "疲惫", "兴奋"];

export type Visibility = "private" | "friends" | "public";

export const VISIBILITIES: { value: Visibility; label: string; hint: string }[] = [
  { value: "private", label: "私密", hint: "仅自己可见" },
  { value: "friends", label: "仅好友", hint: "好友可见" },
  { value: "public", label: "公开", hint: "所有人可见，可分享链接" },
];

export function visibilityLabel(value: Visibility): string {
  return VISIBILITIES.find((item) => item.value === value)?.label ?? "私密";
}

export interface Entry {
  id: string;
  title: string;
  contentMd: string;
  entryDate: string;
  mood: Mood;
  tags: string[];
  visibility: Visibility;
  isPublic: boolean;
  shareSlug: string | null;
  createdAt: string;
  updatedAt: string;
}
