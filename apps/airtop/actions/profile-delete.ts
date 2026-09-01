import type { ActionDefinition } from "@w6w/types";
import { AirtopClient, compact, csv } from "../lib/client.ts";

/**
 * `DELETE /v1/profiles?profileNames=...` — delete one or more saved profiles.
 *
 * The vendor's own `profileIds` query parameter is documented `deprecated:
 * "Use profileNames"`, so only `profileNames` is exposed here.
 */
interface Input {
  profileNames: string;
}

const profileDelete: ActionDefinition<Input> = {
  key: "profile-delete",
  type: "perform",
  resource: "profile",
  title: "Delete Profiles",
  description: "Delete one or more saved profiles by name.",
  idempotent: true,
  params: [
    {
      key: "profileNames",
      label: "Profile names",
      type: "string",
      required: true,
      hint: "Comma-separated list of profile names to delete.",
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "Success" },
    { key: "profileNames", type: "array", label: "Deleted profile names" },
  ],

  async execute(input, ctx) {
    const names = csv(input.profileNames);
    const client = new AirtopClient(ctx);
    await client.status("/v1/profiles", {
      method: "DELETE",
      query: compact({ profileNames: names }),
    });
    return { success: true, profileNames: names ? names.split(",") : [] };
  },
};

export default profileDelete;
