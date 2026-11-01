export type Mood = "开心" | "平静" | "低落" | "疲惫" | "兴奋";

export const MOODS: Mood[] = ["开心", "平静", "低落", "疲惫", "兴奋"];

export interface Entry {
  id: string;
  title: string;
  contentMd: string;
  entryDate: string;
  mood: Mood;
  tags: string[];
  isPublic: boolean;
  shareSlug: string | null;
  createdAt: string;
  updatedAt: string;
}
