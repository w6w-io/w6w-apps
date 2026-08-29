import { assertEquals } from "@std/assert";
import action from "../../actions/contact-get.ts";
import { assertActionRejects, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-get: fetches by id, passes through a bare object", async () => {
  const { ctx, calls } = mockCtx([{ body: { contacts: { id: "c1" } } }]);
  const out = await action.execute({ id: "c1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/contacts/c1");
  assertEquals(out, { id: "c1" });
});

Deno.test("contact-get: unwraps a one-element array defensively", async () => {
  const { ctx } = mockCtx([{ body: { contacts: [{ id: "c1" }] } }]);
  const out = await action.execute({ id: "c1" }, ctx);
  assertEquals(out, { id: "c1" });
});

Deno.test("contact-get: requires id", async () => {
  const { ctx } = mockCtx([]);
  await assertActionRejects(() => action.execute({ id: "" }, ctx));
});
