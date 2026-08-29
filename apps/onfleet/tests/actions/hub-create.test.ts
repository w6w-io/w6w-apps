import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/hub-create.ts";

const addr = '{"number":"2695","street":"East Katella Avenue","city":"Anaheim","country":"US"}';

Deno.test("hub-create: sends name, address and CSV teams", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "hub_1" } }]);
  await action.execute!({ name: "VIP customer", address: addr, teams: "team_1" }, ctx);
  assertEquals(calls[0].url, "https://onfleet.com/api/v2/hubs");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.name, "VIP customer");
  assertEquals(body.teams, ["team_1"]);
});

Deno.test("hub-create: name and address are required", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({ address: addr }, ctx), Error, "name");
  await assertRejects(async () => await action.execute!({ name: "X" }, ctx), Error, "address");
  assertEquals(calls.length, 0);
});
