import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/recipient-create.ts";

Deno.test("recipient-create: sends name and phone", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "rcp_1" } }]);
  await action.execute!({ name: "Neiman Runtilly", phone: "+16505551133" }, ctx);
  assertEquals(calls[0].url, "https://onfleet.com/api/v2/recipients");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Neiman Runtilly",
    phone: "+16505551133",
  });
});

Deno.test("recipient-create: name and phone are required", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({ phone: "+1" }, ctx), Error, "name");
  await assertRejects(async () => await action.execute!({ name: "A" }, ctx), Error, "phone");
  assertEquals(calls.length, 0);
});

Deno.test("recipient-create: is not idempotent", () => {
  assertEquals(action.idempotent, false);
});
