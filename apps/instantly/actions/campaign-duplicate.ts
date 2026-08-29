import type { ActionDefinition } from "@w6w/types";
import { InstantlyClient } from "../lib/client.ts";
import { campaignIdParam } from "../lib/params.ts";

/**
 * `POST /api/v2/campaigns/{id}/duplicate` — copy a campaign's steps and
 * settings into a new one. Not idempotent: every call creates another
 * campaign, and a retry after a dropped response duplicates it again.
 */
interface Input {
  id: string;
  name?: string;
}

const campaignDuplicate: ActionDefinition<Input> = {
  key: "campaign-duplicate",
  type: "perform",
  resource: "campaign",
  title: "Duplicate Campaign",
  description: "Create a copy of a campaign. Defaults the new name to " +
    '"<original name> (copy)" when left empty.',
  idempotent: false,
  params: [
    campaignIdParam,
    { key: "name", label: "New campaign name", type: "string" },
  ],
  output: [
    { key: "id", type: "string", label: "New campaign ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    return new InstantlyClient(ctx).json(
      `/campaigns/${encodeURIComponent(input.id)}/duplicate`,
      { method: "POST", body: { name: input.name } },
    );
  },
};

export default campaignDuplicate;
