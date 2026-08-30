import type { ActionDefinition } from "@w6w/types";
import { QuoClient } from "../lib/client.ts";
import { maxResultsParam, pageTokenParam, paginationOutputFields } from "../lib/params.ts";

/**
 * `GET /v1/contacts` — paginated contacts, optionally filtered by external ID and/or source.
 * With no filters, every contact in the workspace is returned.
 */
interface Input {
  externalIds?: string[];
  sources?: string[];
  maxResults?: number;
  pageToken?: string;
}

const contactList: ActionDefinition<Input> = {
  key: "contact-list",
  type: "search",
  resource: "contact",
  title: "List Contacts",
  description: "Retrieve a paginated list of contacts, optionally filtered by external ID " +
    "and/or source. Returns all contacts when no filters are given.",
  params: [
    {
      key: "externalIds",
      label: "External IDs",
      type: "array",
      advanced: true,
      item: { type: "string" },
      hint: "Only contacts with one of these external IDs (your own identifiers).",
    },
    {
      key: "sources",
      label: "Sources",
      type: "array",
      advanced: true,
      item: { type: "string" },
      hint: "Only contacts created from one of these sources.",
    },
    maxResultsParam(),
    pageTokenParam,
  ],
  output: [
    {
      key: "data",
      type: "array",
      label: "Contacts (id, externalId, source, sourceUrl, defaultFields, customFields, " +
        "createdAt, updatedAt, createdByUserId)",
    },
    ...paginationOutputFields,
  ],

  execute(input, ctx) {
    return new QuoClient(ctx).json("/contacts", {
      query: {
        externalIds: input.externalIds,
        sources: input.sources,
        maxResults: input.maxResults,
        pageToken: input.pageToken,
      },
    });
  },
};

export default contactList;
