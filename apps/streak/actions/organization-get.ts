import type { ActionDefinition } from "@w6w/types";
import { organizationKeyParam } from "../lib/params.ts";
import { encodeId, StreakClient } from "../lib/client.ts";

/** `GET /organizations/{organizationKey}`. */
interface Input {
  organizationKey: string;
}

const organizationGet: ActionDefinition<Input> = {
  key: "organization-get",
  type: "read",
  resource: "organization",
  title: "Get Organization",
  description: "Fetch one organization.",
  params: [organizationKeyParam],
  output: [{ key: "data", type: "object", label: "The organization" }],

  execute(input, ctx) {
    return new StreakClient(ctx).get(`/organizations/${encodeId(input.organizationKey)}`);
  },
};

export default organizationGet;
