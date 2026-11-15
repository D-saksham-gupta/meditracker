import { Entry } from "@/models/Entry";
import { computeStats } from "./streak";
import { dayCounts, dayLevel, normalizeEntry } from "./rules";

export async function getStats(today: string) {
  const docs = (await Entry.find({}).lean()).map(normalizeEntry);
  const counted = docs.filter(dayCounts).map((d) => d.date);
  const fullDays = docs.filter((d) => dayLevel(d) === 2).length;
  const todayEntry = docs.find((d) => d.date === today) ?? null;
  return { ...computeStats(counted, today, fullDays), todayEntry };
}
