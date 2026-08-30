import type { OutputField } from "@w6w/types";

/** `whatconverts.com/api/profiles/` — shared by get/create/edit single-profile responses. */
export const PROFILE_OUTPUT_FIELDS: OutputField[] = [
  { key: "profile_id", type: "number", label: "Profile ID" },
  { key: "profile_name", type: "string", label: "Profile name" },
  { key: "date_created", type: "string", label: "Date created (ISO 8601, UTC)" },
];
