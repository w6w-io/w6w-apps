import { assertEquals, assertRejects } from "@std/assert";
import contactNoteCreate from "../../actions/contact-note-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const CREATED = { id: "9", contact_id: "42" };

Deno.test("contact-note-create: POSTs the note under the contact", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: CREATED }]);
  await contactNoteCreate.execute(
    { contactId: "42", userId: "7", title: "Call", text: "Spoke about renewal" },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/crm/rest/v2/contacts/42/notes");
  assertEquals(JSON.parse(calls[0].body!), {
    user_id: "7",
    title: "Call",
    text: "Spoke about renewal",
  });
});

/**
 * Keap states it on both properties: "A value for either `title` or `type` is
 * required." A note carrying only `text` is a 400.
 */
Deno.test("contact-note-create: a note with neither title nor type is refused up front", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await contactNoteCreate.execute({ contactId: "42", userId: "7", text: "hi" }, ctx),
    Error,
    "either a title or a type",
  );
  assertEquals(calls.length, 0);
});

Deno.test("contact-note-create: a type alone satisfies that requirement", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: CREATED }]);
  await contactNoteCreate.execute({ contactId: "42", userId: "7", type: "Call" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).type, "Call");
});

/** `user_id` is the only entry in the schema's `required` list. */
Deno.test("contact-note-create: the author user id is a required param", () => {
  const param = contactNoteCreate.params?.find((p) => p.key === "userId");
  assertEquals(param?.required, true);
});

Deno.test("contact-note-create: is declared non-idempotent — a retry is a second note", () => {
  assertEquals(contactNoteCreate.idempotent, false);
});
