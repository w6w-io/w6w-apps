import type { ActionDefinition } from "@w6w/types";
import { AffinityClient, compact } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

/**
 * `GET /notes` — notes attached to a person, organization, opportunity, or
 * created by a given user.
 *
 * The docs document `page_size`/`page_token` query parameters here (as they
 * do for persons/organizations/opportunities), but this endpoint's own
 * "Returns" text says only "An array of all the note resources available to
 * you" — never describing a `{notes, next_page_token}` envelope the way the
 * search endpoints explicitly do. Rather than guess at an undocumented
 * response shape, this action passes the params through and returns
 * whatever the API answers unchanged.
 */
interface Input {
  personId?: number;
  organizationId?: number;
  opportunityId?: number;
  creatorId?: number;
  pageSize?: number;
  pageToken?: string;
}

const notesList: ActionDefinition<Input> = {
  key: "notes-list",
  type: "read",
  resource: "note",
  title: "List Notes",
  description: "Get notes, optionally filtered by person, organization, opportunity, or creator.",
  params: [
    { key: "personId", label: "Person ID", type: "number", validation: { integer: true } },
    {
      key: "organizationId",
      label: "Organization ID",
      type: "number",
      validation: { integer: true },
    },
    {
      key: "opportunityId",
      label: "Opportunity ID",
      type: "number",
      validation: { integer: true },
    },
    {
      key: "creatorId",
      label: "Creator (internal person) ID",
      type: "number",
      validation: { integer: true },
    },
    ...paginationParams(100),
  ],
  output: [{ key: "notes", type: "array", label: "Notes" }],

  execute(input, ctx) {
    return new AffinityClient(ctx).json("/notes", {
      query: compact({
        person_id: input.personId,
        organization_id: input.organizationId,
        opportunity_id: input.opportunityId,
        creator_id: input.creatorId,
        page_size: input.pageSize ?? 100,
        page_token: input.pageToken,
      }),
    });
  },
};

export default notesList;
