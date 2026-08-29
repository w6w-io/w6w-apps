import type { ActionDefinition } from "@w6w/types";
import { compact, MissiveClient } from "../lib/client.ts";

interface Input {
  limit?: number;
  offset?: number;
}

/**
 * `GET /v1/contact_books` — verified against
 * `missiveapp.com/docs/developers/rest-api/endpoints` §Contact books,
 * 2026-08-29.
 *
 * A contact book's `id` is required to create a contact, so this is usually
 * the first call in a contact-sync workflow.
 */
const action: ActionDefinition<Input> = {
  key: "contact-book-list",
  type: "read",
  resource: "contact-book",
  title: "List Contact Books",
  description: "List contact books the authenticated user has access to.",
  params: [
    { key: "limit", label: "Limit", type: "number", default: 50, hint: "Max: 200." },
    { key: "offset", label: "Offset", type: "number", default: 0, advanced: true },
  ],
  output: [
    { key: "contact_books", type: "array", label: "Contact Books" },
  ],

  async execute(input, ctx) {
    const res = await new MissiveClient(ctx).json<{ contact_books: unknown[] }>(
      "/contact_books",
      { query: compact({ limit: input.limit, offset: input.offset }) },
    );
    return res.contact_books;
  },
};

export default action;
