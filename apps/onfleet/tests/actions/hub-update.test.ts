import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/hub-update.ts";

Deno.test("hub-update: sends only the provided fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "hub_1" } }]);
  await action.execute!({ hubId: "hub_1", name: "change", phone: "+16265551234" }, ctx);
  assertEquals(calls[0].url, "https://onfleet.com/api/v2/hubs/hub_1");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { name: "change", phone: "+16265551234" });
});

Deno.test("hub-update: hubId is required", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "hubId");
  assertEquals(calls.length, 0);
});

Deno.test("hub-update: refuses an empty update", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ hubId: "hub_1" }, ctx),
    Error,
    "no fields",
  );
  assertEquals(calls.length, 0);
});
