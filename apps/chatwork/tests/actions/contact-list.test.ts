import { assertEquals } from "@std/assert";
import contactList from "../../actions/contact-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-list: calls GET /contacts", async () => {
  const contacts = [{ account_id: 1, room_id: 2, name: "Bob", chatwork_id: "bob" }];
  const { ctx, calls } = mockCtx([{ body: contacts }]);
  const out = await contactList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/contacts");
  assertEquals(out, contacts);
});

Deno.test("contact-list: a 204 (no contacts) normalises to an empty array", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  const out = await contactList.execute({}, ctx);
  assertEquals(out, []);
});
