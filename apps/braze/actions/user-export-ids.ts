import type { ActionDefinition } from "@w6w/types";
import { BrazeClient } from "../lib/client.ts";

/**
 * `POST /users/export/ids` — verified against the fetched spec. A POST on the
 * wire, but a pure lookup with no side effects, so it is modeled as `read`
 * like every other lookup-by-identifier action in this pack. Exactly one of
 * `external_ids`, `user_aliases`, `device_id`, `braze_id`, `email_address`, or
 * `phone` should be set per the spec's example.
 */
const action: ActionDefinition = {
  key: "user-export-ids",
  type: "read",
  resource: "user",
  title: "Export User Profiles",
  description: "Export full user profiles by external ID, alias, device ID, Braze ID, or contact.",
  params: [
    {
      key: "externalIds",
      label: "External IDs",
      type: "array",
      item: { type: "string" },
    },
    {
      key: "userAliases",
      label: "User Aliases",
      type: "json",
      hint: "Array of { alias_name, alias_label }.",
    },
    { key: "deviceId", label: "Device ID", type: "string" },
    { key: "brazeId", label: "Braze ID", type: "string" },
    { key: "emailAddress", label: "Email Address", type: "string" },
    { key: "phone", label: "Phone", type: "string" },
    {
      key: "fieldsToExport",
      label: "Fields to Export",
      type: "array",
      item: { type: "string" },
      hint: "Leave empty to export every field Braze returns for the user.",
    },
  ],
  output: [
    { key: "users", type: "array", label: "Users" },
  ],

  async execute(input, ctx) {
    const p = input as {
      externalIds?: string[];
      userAliases?: unknown;
      deviceId?: string;
      brazeId?: string;
      emailAddress?: string;
      phone?: string;
      fieldsToExport?: string[];
    };
    ctx.log("info", "exporting Braze user profile(s)");
    return await new BrazeClient(ctx).post("/users/export/ids", {
      external_ids: p.externalIds?.length ? p.externalIds : undefined,
      user_aliases: p.userAliases ?? undefined,
      device_id: p.deviceId || undefined,
      braze_id: p.brazeId || undefined,
      email_address: p.emailAddress || undefined,
      phone: p.phone || undefined,
      fields_to_export: p.fieldsToExport?.length ? p.fieldsToExport : undefined,
    });
  },
};

export default action;
