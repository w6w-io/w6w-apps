import { assertEquals } from "@std/assert";
import action from "../../actions/contact-update.ts";
import { assertActionRejects, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-update: patches only the fields set", async () => {
  const { ctx, calls } = mockCtx([{ body: { contacts: [{ id: "c1", last_name: "Lehoux" }] } }]);
  const out = await action.execute({ id: "c1", lastName: "Lehoux" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/contacts/c1");
  assertEquals(calls[0].method, "PATCH");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.contacts, [{ id: "c1", last_name: "Lehoux" }]);
  assertEquals(out, { id: "c1", last_name: "Lehoux" });
});

Deno.test("contact-update: requires id", async () => {
  const { ctx } = mockCtx([]);
  await assertActionRejects(() => action.execute({ id: "" }, ctx));
});
