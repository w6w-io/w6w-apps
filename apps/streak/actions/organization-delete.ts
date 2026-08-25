import type { ActionDefinition } from "@w6w/types";
import { organizationKeyParam } from "../lib/params.ts";
import { encodeId, StreakClient } from "../lib/client.ts";

/** `DELETE /organizations/{organizationKey}`. */
interface Input {
  organizationKey: string;
}

const organizationDelete: ActionDefinition<Input> = {
  key: "organization-delete",
  type: "perform",
  resource: "organization",
  title: "Delete Organization",
  description: "Permanently delete an organization.",
  idempotent: true,
  params: [organizationKeyParam],
  output: [{ key: "success", type: "boolean", label: "Deleted" }],

  execute(input, ctx) {
    return new StreakClient(ctx).del(`/organizations/${encodeId(input.organizationKey)}`);
  },
};

export default organizationDelete;
