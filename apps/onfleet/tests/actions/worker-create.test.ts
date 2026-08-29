import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/worker-create.ts";

Deno.test("worker-create: sends the required fields and parses the vehicle", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "w1", name: "A" } }]);
  await action.execute!({
    name: "A Swartz",
    phone: "+16175558853",
    teams: "team_1, team_2",
    vehicle: '{"type":"CAR","color":"purple"}',
  }, ctx);
  assertEquals(calls[0].url, "https://onfleet.com/api/v2/workers");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.teams, ["team_1", "team_2"]);
  assertEquals(body.vehicle, { type: "CAR", color: "purple" });
});

Deno.test("worker-create: name, phone and teams are all required", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ phone: "+1", teams: "t1" }, ctx),
    Error,
    "name",
  );
  await assertRejects(
    async () => await action.execute!({ name: "A", teams: "t1" }, ctx),
    Error,
    "phone",
  );
  await assertRejects(
    async () => await action.execute!({ name: "A", phone: "+1" }, ctx),
    Error,
    "teams",
  );
  assertEquals(calls.length, 0);
});

Deno.test("worker-create: is not idempotent", () => {
  assertEquals(action.idempotent, false);
});
