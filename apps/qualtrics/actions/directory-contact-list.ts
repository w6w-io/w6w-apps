import type { ActionDefinition } from "@w6w/types";
import { encodeId, QualtricsClient } from "../lib/client.ts";
import { idParam, maxPagesParam } from "../lib/params.ts";

interface Input {
  directoryId: string;
  maxPages?: number;
}

/**
 * `GET /API/v3/directories/{directoryId}/contacts` — contacts in one pool.
 *
 * Confirmed live on 2026-09-22 (`400 ATP_2` unauthenticated, not a 404).
 * Contacts are directory-scoped: this route exists, a bare top-level
 * `/API/v3/contacts` does not.
 */
const directoryContactList: ActionDefinition<Input> = {
  key: "directory-contact-list",
  type: "search",
  resource: "directory-contact",
  title: "List Directory Contacts",
  description: "List the contacts in one XM Directory pool.",
  params: [
    idParam(
      "directoryId",
      "Directory ID",
      "Read it from List Directories. The default pool is usually named `POOL_<id>`.",
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
      `/directories/${encodeId(input.directoryId)}/contacts`,
      { maxPages: input.maxPages },
    );
    return { elements, count: elements.length, pages, nextPage };
  },
};

export default directoryContactList;
