import { assertEquals } from "@std/assert";
import robotGet from "../../actions/robot-get.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("robot-get: GETs /robots/{robotId} and unwraps the robot key", async () => {
  const robot = { id: "r1", name: "Extract data", createdAt: 1 };
  const { ctx, calls } = mockCtx([{ status: 200, body: envelope("robot", robot) }]);
  const out = await robotGet.execute({ robotId: "r1" }, ctx) as typeof robot;

  assertEquals(pathOf(calls[0].url), "/v2/robots/r1");
  assertEquals(out.id, "r1");
  assertEquals(out.name, "Extract data");
});

Deno.test("robot-get: path-encodes the robot ID", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: envelope("robot", { id: "a/b" }) }]);
  await robotGet.execute({ robotId: "a/b" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/robots/a%2Fb");
});
