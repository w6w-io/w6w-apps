import type { ActionDefinition } from "@w6w/types";
import { encodeId, eq, joinFilters, KeapClient, nextPageToken, V2 } from "../lib/client.ts";
import { filterParam, orderByParam, pageParams } from "../lib/params.ts";

/**
 * `GET /rest/v2/contacts/{contact_id}/notes` — List Notes for a contact.
 *
 * Keap also publishes `GET /rest/v2/notes` (List All Notes) with the identical
 * filter grammar and the identical `ListNotesResponse` shape. The per-contact
 * form is the one modelled here because it is the one that cannot be got wrong:
 * the account-wide form needs `contact_id` inside the `filter` string to be
 * scoped, and forgetting that returns every note in the account.
 *
 * `title` is the one filter clause whose operator does not mean what it looks
 * like. Keap: "`title` — supports `==`. Bare value matches anywhere in the
 * title (contains). Wildcard prefix match also supported." So `title==Follow`
 * is a *substring* search and `title==Follow*` is a prefix search — the
 * opposite of the narrowing you would expect the `*` to do.
 */
interface Input {
  contactId: string;
  title?: string;
  filter?: string;
  orderBy?: string;
  fields?: string;
  pageSize?: number;
  pageToken?: string;
}

const contactNotesList: ActionDefinition<Input> = {
  key: "contact-notes-list",
  type: "read",
  title: "List Contact Notes",
  resource: "note",
  description: "List the notes recorded against a contact.",
  params: [
    { key: "contactId", label: "Contact ID", type: "string", required: true },
    {
      key: "title",
      label: "Title contains",
      type: "string",
      hint: "A bare value matches anywhere in the title. Add a trailing `*` to match a prefix " +
        "instead.",
    },
    filterParam,
    orderByParam("One of `id`, `create_time`, `update_time`, plus `asc` or `desc`."),
    {
      key: "fields",
      label: "Fields",
      type: "string",
      advanced: true,
      hint: "Only `custom_fields` is accepted here.",
    },
    ...pageParams(),
  ],
  output: [
    { key: "notes", type: "array", label: "Notes" },
    { key: "count", type: "number", label: "Notes returned" },
    { key: "nextPageToken", type: "string", label: "Next page token" },
  ],

  async execute(input, ctx) {
    const filter = joinFilters([eq("title", input.title), input.filter]);
    const client = new KeapClient(ctx);
    const body = await client.json<{ notes?: unknown[]; next_page_token?: string }>(
      `${V2}/contacts/${encodeId(input.contactId)}/notes`,
      {
        query: {
          filter,
          order_by: input.orderBy,
          fields: input.fields,
          page_size: input.pageSize,
          page_token: input.pageToken,
        },
      },
    );
    const notes = body?.notes ?? [];
    return { notes, count: notes.length, nextPageToken: nextPageToken(body) };
  },
};

export default contactNotesList;
