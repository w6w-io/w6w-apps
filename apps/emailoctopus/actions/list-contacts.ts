import type { ActionDefinition } from "@w6w/types";
import {
  CONTACT_STATUS_OPTIONS,
  type ContactStatus,
  EmailOctopusClient,
  type Page,
  PAGE_OUTPUT,
  PAGE_PARAMS,
  type PageInput,
  pageQuery,
  seg,
} from "../lib/client.ts";

interface Input extends PageInput {
  listId: string;
  tag?: string;
  status?: ContactStatus;
  createdAtGte?: string;
  createdAtLte?: string;
  lastUpdatedAtGte?: string;
  lastUpdatedAtLte?: string;
}

/**
 * `GET /lists/{list_id}/contacts`.
 *
 * The date filters are the API's own dotted parameter names —
 * `created_at.gte`, `last_updated_at.lte` and so on. They are query-string keys
 * with literal dots in them, not nested objects, which is why they are set
 * verbatim rather than built from a structure.
 */
const listContacts: ActionDefinition<Input> = {
  key: "list-contacts",
  type: "search",
  resource: "contact",
  title: "List Contacts",
  description:
    "Fetch one cursor page of a list's contacts, optionally narrowed by tag, status, or creation/update date range.",
  params: [
    {
      key: "listId",
      label: "List ID",
      type: "string",
      required: true,
      placeholder: "00000000-0000-0000-0000-000000000000",
    },
    { key: "tag", label: "Tag", type: "string", hint: "Only contacts carrying this exact tag." },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: CONTACT_STATUS_OPTIONS,
      hint: "Omit for every status. EmailOctopus applies no default filter.",
    },
    {
      key: "createdAtGte",
      label: "Created on or after",
      type: "datetime",
      hint: "ISO 8601, e.g. `2026-01-19T12:14:28Z`. Sent as `created_at.gte`.",
    },
    {
      key: "createdAtLte",
      label: "Created on or before",
      type: "datetime",
      hint: "ISO 8601. Sent as `created_at.lte`.",
    },
    {
      key: "lastUpdatedAtGte",
      label: "Updated on or after",
      type: "datetime",
      hint: "ISO 8601. Sent as `last_updated_at.gte`.",
    },
    {
      key: "lastUpdatedAtLte",
      label: "Updated on or before",
      type: "datetime",
      hint: "ISO 8601. Sent as `last_updated_at.lte`.",
    },
    ...PAGE_PARAMS,
  ],
  output: PAGE_OUTPUT,

  execute(input, ctx) {
    return new EmailOctopusClient(ctx).request<Page>(`/lists/${seg(input.listId)}/contacts`, {
      query: {
        ...pageQuery(input),
        tag: input.tag,
        status: input.status,
        "created_at.gte": input.createdAtGte,
        "created_at.lte": input.createdAtLte,
        "last_updated_at.gte": input.lastUpdatedAtGte,
        "last_updated_at.lte": input.lastUpdatedAtLte,
      },
    });
  },
};

export default listContacts;
