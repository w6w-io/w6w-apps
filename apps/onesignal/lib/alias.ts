import type { Param } from "@w6w/types";

/**
 * Shared alias-lookup params. Almost every per-user endpoint addresses a user
 * by `{alias_label}/{alias_id}` rather than a single id — most commonly
 * `external_id/<your-id>`, but `onesignal_id` or a custom alias key both work.
 */
export const ALIAS_PARAMS: Param[] = [
  {
    key: "aliasLabel",
    label: "Alias Label",
    type: "string",
    default: "external_id",
    hint: "Most commonly external_id. Can also be onesignal_id or a custom alias key.",
  },
  { key: "aliasId", label: "Alias Value", type: "string", required: true },
];

export function aliasPath(aliasLabel: string | undefined, aliasId: string): string {
  const label = (aliasLabel || "external_id").trim();
  return `/by/${encodeURIComponent(label)}/${encodeURIComponent(aliasId)}`;
}
