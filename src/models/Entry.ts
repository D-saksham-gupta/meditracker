import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * One document per day that has anything logged. A session only counts as meditation
 * when it is >= 15 minutes (see src/lib/rules.ts). Add future fields here.
 */
const EntrySchema = new Schema(
  {
    date: { type: String, required: true, unique: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    morningMinutes: { type: Number, min: 0, max: 1440, default: null },
    eveningMinutes: { type: Number, min: 0, max: 1440, default: null },
    note: { type: String, maxlength: 500, default: "" },
    /** Legacy (v1) single-session field. No longer written; still read by normalizeEntry(). */
    minutes: { type: Number },
  },
  { timestamps: true }
);

export type EntryDoc = InferSchemaType<typeof EntrySchema>;

export const Entry: Model<EntryDoc> =
  (mongoose.models.Entry as Model<EntryDoc>) || mongoose.model<EntryDoc>("Entry", EntrySchema);
