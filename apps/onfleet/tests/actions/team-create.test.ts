import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/team-create.ts";

Deno.test("team-create: sends the name and CSV worker/manager lists", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "team_1" } }]);
  await action.execute!({ name: "Sunset", workers: "w1, w2", managers: "a1" }, ctx);
  assertEquals(calls[0].url, "https://onfleet.com/api/v2/teams");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Sunset",
    workers: ["w1", "w2"],
    managers: ["a1"],
  });
});

Deno.test("team-create: name is required", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "name");
  assertEquals(calls.length, 0);
});

Deno.test("team-create: is not idempotent", () => {
  assertEquals(action.idempotent, false);
});
