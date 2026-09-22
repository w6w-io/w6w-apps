import type { ActionDefinition } from "@w6w/types";
import { QualtricsClient } from "../lib/client.ts";
import { maxPagesParam } from "../lib/params.ts";

interface Input {
  maxPages?: number;
}

/**
 * `GET /API/v3/directories` — the account's XM Directory contact pools.
 *
 * Confirmed live on 2026-09-22 (`400 ATP_2` unauthenticated, not a 404).
 * Contacts are reached through a directory, never from a top-level `/contacts`
 * — that path 404s, so a directory id is required before any contact read.
 */
const directoryList: ActionDefinition<Input> = {
  key: "directory-list",
  type: "search",
  resource: "directory",
  title: "List Directories",
  description: "List the XM Directory contact pools in this account.",
  params: [maxPagesParam],
  output: [
    { key: "elements", type: "array", label: "Directories" },
    { key: "count", type: "number", label: "Directories returned" },
    { key: "pages", type: "number", label: "Pages fetched" },
    { key: "nextPage", type: "string", label: "URL of the next page, when more results exist" },
  ],

  async execute(input, ctx) {
    const { elements, nextPage, pages } = await new QualtricsClient(ctx).list("/directories", {
      maxPages: input.maxPages,
    });
    return { elements, count: elements.length, pages, nextPage };
  },
};

export default directoryList;
