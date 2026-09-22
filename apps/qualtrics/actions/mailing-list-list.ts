import type { ActionDefinition } from "@w6w/types";
import { QualtricsClient } from "../lib/client.ts";
import { maxPagesParam } from "../lib/params.ts";

interface Input {
  maxPages?: number;
}

/**
 * `GET /API/v3/mailinglists` — the account's mailing lists.
 *
 * Confirmed live on 2026-09-22 (`400 ATP_2` unauthenticated, not a 404).
 */
const mailingListList: ActionDefinition<Input> = {
  key: "mailing-list-list",
  type: "search",
  resource: "mailing-list",
  title: "List Mailing Lists",
  description: "List the mailing lists in this Qualtrics account.",
  params: [maxPagesParam],
  output: [
    { key: "elements", type: "array", label: "Mailing lists" },
    { key: "count", type: "number", label: "Mailing lists returned" },
    { key: "pages", type: "number", label: "Pages fetched" },
    { key: "nextPage", type: "string", label: "URL of the next page, when more results exist" },
  ],

  async execute(input, ctx) {
    const { elements, nextPage, pages } = await new QualtricsClient(ctx).list("/mailinglists", {
      maxPages: input.maxPages,
    });
    return { elements, count: elements.length, pages, nextPage };
  },
};

export default mailingListList;
