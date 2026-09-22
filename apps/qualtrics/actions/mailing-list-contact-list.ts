import type { ActionDefinition } from "@w6w/types";
import { encodeId, QualtricsClient } from "../lib/client.ts";
import { idParam, maxPagesParam } from "../lib/params.ts";

interface Input {
  mailingListId: string;
  maxPages?: number;
}

/**
 * `GET /API/v3/mailinglists/{mailingListId}/contacts` — contacts on one list.
 *
 * Confirmed live on 2026-09-22 (`400 ATP_2` unauthenticated, not a 404).
 */
const mailingListContactList: ActionDefinition<Input> = {
  key: "mailing-list-contact-list",
  type: "search",
  resource: "mailing-list-contact",
  title: "List Mailing List Contacts",
  description: "List the contacts on one mailing list.",
  params: [
    idParam(
      "mailingListId",
      "Mailing List ID",
      "Starts with `CG_`. Read it from List Mailing Lists.",
    ),
    maxPagesParam,
  ],
  output: [
    { key: "elements", type: "array", label: "Contacts" },
    { key: "count", type: "number", label: "Contacts returned" },
    { key: "pages", type: "number", label: "Pages fetched" },
    { key: "nextPage", type: "string", label: "URL of the next page, when more results exist" },
  ],

  async execute(input, ctx) {
    const { elements, nextPage, pages } = await new QualtricsClient(ctx).list(
      `/mailinglists/${encodeId(input.mailingListId)}/contacts`,
      { maxPages: input.maxPages },
    );
    return { elements, count: elements.length, pages, nextPage };
  },
};

export default mailingListContactList;
