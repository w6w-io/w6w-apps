import { assertEquals } from "@std/assert";
import sequenceCreate from "../../actions/sequence-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("sequence-create: POSTs name (and scheduleId when given), never a partial settings object", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 1, name: "Cold outreach" } }]);
  await sequenceCreate.execute({ name: "Cold outreach", scheduleId: 5 }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v3/sequences");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { name: "Cold outreach", scheduleId: 5 });
  assertEquals("settings" in body, false);
});

Deno.test("sequence-create: name alone is a valid call", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 1 } }]);
  await sequenceCreate.execute({ name: "Cold outreach" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { name: "Cold outreach" });
});

Deno.test("sequence-create: is not idempotent", () => {
  assertEquals(sequenceCreate.idempotent, false);
});
