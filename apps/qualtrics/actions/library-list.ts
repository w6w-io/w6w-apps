import type { ActionDefinition } from "@w6w/types";
import { QualtricsClient } from "../lib/client.ts";
import { maxPagesParam } from "../lib/params.ts";

interface Input {
  maxPages?: number;
}

/**
 * `GET /API/v3/libraries` — the account's message/content libraries.
 *
 * Confirmed live on 2026-09-22 (`400 ATP_2` unauthenticated, not a 404).
 */
const libraryList: ActionDefinition<Input> = {
  key: "library-list",
  type: "search",
  resource: "library",
  title: "List Libraries",
  description: "List the account's libraries.",
  params: [maxPagesParam],
  output: [
    { key: "elements", type: "array", label: "Libraries" },
    { key: "count", type: "number", label: "Libraries returned" },
    { key: "pages", type: "number", label: "Pages fetched" },
    { key: "nextPage", type: "string", label: "URL of the next page, when more results exist" },
  ],

  async execute(input, ctx) {
    const { elements, nextPage, pages } = await new QualtricsClient(ctx).list("/libraries", {
      maxPages: input.maxPages,
    });
    return { elements, count: elements.length, pages, nextPage };
  },
};

export default libraryList;
