import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/worker-get.ts";

Deno.test("worker-get: fetches by id with no query params by default", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "w1", onDuty: true } }]);
  await action.execute!({ workerId: "w1" }, ctx);
  assertEquals(calls[0].url, "https://onfleet.com/api/v2/workers/w1");
});

Deno.test("worker-get: analytics and a time window are passed as query params", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ workerId: "w1", analytics: true, from: 1, to: 2 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("analytics"), "true");
  assertEquals(url.searchParams.get("from"), "1");
  assertEquals(url.searchParams.get("to"), "2");
});

Deno.test("worker-get: workerId is required", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "workerId");
  assertEquals(calls.length, 0);
});
