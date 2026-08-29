import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/worker-update.ts";

Deno.test("worker-update: sends only the provided fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "w1" } }]);
  await action.execute!({ workerId: "w1", name: "Laura P", teams: "team_1" }, ctx);
  assertEquals(calls[0].url, "https://onfleet.com/api/v2/workers/w1");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { name: "Laura P", teams: ["team_1"] });
});

Deno.test("worker-update: does not offer a way to change phone", () => {
  const keys = (action.params as Array<{ key: string }>).map((p) => p.key);
  assertEquals(keys.includes("phone"), false);
  assert(/phone.*cannot be changed/i.test(action.description!), action.description);
});

Deno.test("worker-update: workerId is required", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "workerId");
  assertEquals(calls.length, 0);
});

Deno.test("worker-update: refuses an empty update", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ workerId: "w1" }, ctx),
    Error,
    "no fields",
  );
  assertEquals(calls.length, 0);
});
