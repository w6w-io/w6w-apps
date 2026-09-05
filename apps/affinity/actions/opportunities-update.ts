import type { ActionDefinition } from "@w6w/types";
import { AffinityClient, compact, toIdList } from "../lib/client.ts";
import { opportunityIdPathParam } from "../lib/params.ts";

/**
 * `PUT /opportunities/{opportunity_id}`. The docs' example curl for this
 * endpoint shows `-X POST` while the endpoint heading and every sibling
 * update endpoint (persons, organizations, lists, notes) say `PUT` — treated
 * here as a documentation inconsistency and implemented as `PUT`, matching
 * the stated method and the rest of the API's own convention.
 *
 * Adding a person or organization requires resending the existing ids too —
 * this replaces rather than merges.
 */
interface Input {
  opportunityId: number;
  name?: string;
  personIds?: string;
  organizationIds?: string;
}

const opportunitiesUpdate: ActionDefinition<Input> = {
  key: "opportunities-update",
  type: "perform",
  resource: "opportunity",
  title: "Update Opportunity",
  description:
    "Update an opportunity. To add a person or organization, resend the existing IDs too — this " +
    "replaces the list rather than merging into it.",
  idempotent: false,
  params: [
    opportunityIdPathParam,
    { key: "name", label: "Name", type: "string" },
    {
      key: "personIds",
      label: "Person IDs",
      type: "string",
      hint: "Comma-separated. Replaces the full list — include existing IDs you want kept.",
    },
    {
      key: "organizationIds",
      label: "Organization IDs",
      type: "string",
      hint: "Comma-separated. Replaces the full list — include existing IDs you want kept.",
    },
  ],
  output: [{ key: "id", type: "number", label: "Opportunity ID" }],

  execute(input, ctx) {
    return new AffinityClient(ctx).json(`/opportunities/${input.opportunityId}`, {
      method: "PUT",
      body: compact({
        name: input.name,
        person_ids: toIdList(input.personIds),
        organization_ids: toIdList(input.organizationIds),
      }),
    });
  },
};

export default opportunitiesUpdate;
