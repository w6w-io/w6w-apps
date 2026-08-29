import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/team-update.ts";

Deno.test("team-update: sends only the provided fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "team_1" } }]);
  await action.execute!({ teamId: "team_1", workers: "w1, w2, w3" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { workers: ["w1", "w2", "w3"] });
});

Deno.test("team-update: warns that workers/managers replace the whole list", () => {
  assert(/REPLACE the whole list/.test(action.description!), action.description);
});

Deno.test("team-update: teamId is required", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "teamId");
  assertEquals(calls.length, 0);
});

Deno.test("team-update: refuses an empty update", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ teamId: "team_1" }, ctx),
    Error,
    "no fields",
  );
  assertEquals(calls.length, 0);
});
