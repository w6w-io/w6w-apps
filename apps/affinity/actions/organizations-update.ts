import type { ActionDefinition } from "@w6w/types";
import { AffinityClient, compact, toIdList } from "../lib/client.ts";
import { organizationIdPathParam } from "../lib/params.ts";

/**
 * `PUT /organizations/{organization_id}`. Adding a person requires resending
 * the existing `person_ids` too — this replaces rather than merges. Global
 * organizations (`global: true` on the resource) cannot have their name or
 * domain changed.
 */
interface Input {
  organizationId: number;
  name?: string;
  domain?: string;
  personIds?: string;
}

const organizationsUpdate: ActionDefinition<Input> = {
  key: "organizations-update",
  type: "perform",
  resource: "organization",
  title: "Update Organization",
  description:
    "Update an organization. To add a person, resend the existing person_ids too — this " +
    "replaces the list rather than merging into it. A global organization's name/domain cannot " +
    "be changed.",
  idempotent: false,
  params: [
    organizationIdPathParam,
    { key: "name", label: "Name", type: "string" },
    { key: "domain", label: "Domain", type: "string" },
    {
      key: "personIds",
      label: "Person IDs",
      type: "string",
      hint: "Comma-separated. Replaces the full list — include existing IDs you want kept.",
    },
  ],
  output: [{ key: "id", type: "number", label: "Organization ID" }],

  execute(input, ctx) {
    return new AffinityClient(ctx).json(`/organizations/${input.organizationId}`, {
      method: "PUT",
      body: compact({
        name: input.name,
        domain: input.domain,
        person_ids: toIdList(input.personIds),
      }),
    });
  },
};

export default organizationsUpdate;
