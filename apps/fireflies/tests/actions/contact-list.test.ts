import { assert, assertEquals } from "@std/assert";
import { mockCtx, sent } from "../_helpers.ts";
import action from "../../actions/contact-list.ts";

Deno.test("contact-list: sends the documented no-argument query", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { contacts: [{ email: "a@b.com" }] } } }]);
  const out = await action.execute({}, ctx);
  const { query, variables } = sent(calls[0]);
  assert(query.includes("contacts {"));
  assert(query.includes("last_meeting_date"));
  assertEquals(variables, {});
  assertEquals((out as { contacts: unknown[] }).contacts.length, 1);
});

Deno.test("contact-list: declares no params, so it is safe to invoke with {}", () => {
  assertEquals(action.params, []);
  assertEquals(action.type, "read");
});
