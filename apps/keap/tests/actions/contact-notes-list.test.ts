import { assertEquals } from "@std/assert";
import contactNotesList from "../../actions/contact-notes-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const PAGE = { notes: [{ id: "5", title: "Follow up" }], next_page_token: "" };

Deno.test("contact-notes-list: reads the per-contact notes path, not the account-wide one", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  const out = await contactNotesList.execute({ contactId: "42" }, ctx) as { count: number };
  // The account-wide `/rest/v2/notes` needs contact_id inside the filter to be
  // scoped, and forgetting that returns every note in the account.
  assertEquals(pathOf(calls[0].url), "/crm/rest/v2/contacts/42/notes");
  assertEquals(out.count, 1);
});

Deno.test("contact-notes-list: an empty next_page_token is reported as absent", async () => {
  const { ctx } = mockCtx([{ body: PAGE }]);
  const out = await contactNotesList.execute({ contactId: "42" }, ctx) as {
    nextPageToken?: string;
  };
  assertEquals(out.nextPageToken, undefined);
});

Deno.test("contact-notes-list: the title clause is sent as an equality clause", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  await contactNotesList.execute({ contactId: "42", title: "Follow" }, ctx);
  // `==` here is a *contains* match per Keap's own note, which is why the
  // param is labelled "Title contains".
  assertEquals(queryOf(calls[0].url).filter, "title==Follow");
});

Deno.test("contact-notes-list: only custom_fields is offered for the fields selector", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  await contactNotesList.execute({ contactId: "42", fields: "custom_fields" }, ctx);
  assertEquals(queryOf(calls[0].url).fields, "custom_fields");
});
