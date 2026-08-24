import type { ActionDefinition } from "@w6w/types";
import { compact, SystemeClient } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

interface Input {
  email?: string;
  tags?: string;
  bounced?: boolean;
  unsubscribed?: boolean;
  needsConfirmation?: boolean;
  registeredBefore?: string;
  registeredAfter?: string;
  limit?: number;
  startingAfter?: number;
  order?: "asc" | "desc";
}

/**
 * `GET /api/contacts` — every filter here is copied from the OpenAPI
 * document's own `parameters` list for this operation, not guessed.
 *
 * `tags` is a comma-separated list of tag IDs and matches contacts carrying
 * **all** of them (an AND filter, per the vendor's own parameter description),
 * not any one of them.
 */
const contactList: ActionDefinition<Input> = {
  key: "contact-list",
  type: "read",
  resource: "contact",
  title: "List Contacts",
  description: "Retrieve the collection of Contact resources, with optional filters.",
  params: [
    { key: "email", label: "Email", type: "string", hint: "Filter by exact email." },
    {
      key: "tags",
      label: "Tag IDs",
      type: "string",
      placeholder: "1,2,3",
      hint: "Comma-separated tag IDs. Returns contacts carrying ALL of the listed tags, not any.",
    },
    { key: "bounced", label: "Bounced", type: "boolean", hint: "Filter by bounced state." },
    {
      key: "unsubscribed",
      label: "Unsubscribed",
      type: "boolean",
      hint: "Filter by unsubscribed state.",
    },
    {
      key: "needsConfirmation",
      label: "Needs confirmation",
      type: "boolean",
      hint: "Filter by double opt-in confirmation state.",
    },
    {
      key: "registeredBefore",
      label: "Registered before",
      type: "datetime",
      hint: "ISO 8601, e.g. 2023-11-22T00:00:00+00:00.",
    },
    {
      key: "registeredAfter",
      label: "Registered after",
      type: "datetime",
      hint: "ISO 8601, e.g. 2023-11-22T23:59:59+00:00.",
    },
    ...paginationParams(),
  ],
  output: [
    { key: "items", type: "array", label: "Contacts" },
    { key: "hasMore", type: "boolean", label: "Whether another page is available" },
  ],

  async execute(input, ctx) {
    return await new SystemeClient(ctx).get("/api/contacts", compact({ ...input }));
  },
};

export default contactList;
