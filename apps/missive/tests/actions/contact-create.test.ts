import { assertEquals } from "@std/assert";
import action from "../../actions/contact-create.ts";
import { assertActionRejects, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-create: posts a single-element contacts array and returns the created contact", async () => {
  const { ctx, calls } = mockCtx([{ body: { contacts: [{ id: "c1", first_name: "Phil" }] } }]);
  const out = await action.execute(
    { contactBook: "book-1", firstName: "Phil", infos: '[{"kind":"email","value":"a@b.com"}]' },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/v1/contacts");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.contacts.length, 1);
  assertEquals(body.contacts[0].contact_book, "book-1");
  assertEquals(body.contacts[0].infos, [{ kind: "email", value: "a@b.com" }]);
  assertEquals(out, { id: "c1", first_name: "Phil" });
});

Deno.test("contact-create: requires contactBook", async () => {
  const { ctx } = mockCtx([]);
  await assertActionRejects(() => action.execute({ contactBook: "" }, ctx));
});

Deno.test("contact-create: rejects invalid JSON in infos", async () => {
  const { ctx } = mockCtx([]);
  await assertActionRejects(() => action.execute({ contactBook: "b1", infos: "{not json" }, ctx));
});
