import { assertEquals } from "@std/assert";
import robotList from "../../actions/robot-list.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("robot-list: GETs /robots with no query params", async () => {
  const robots = { totalCount: 1, items: [{ id: "r1", createdAt: 1 }] };
  const { ctx, calls } = mockCtx([{ status: 200, body: envelope("robots", robots) }]);
  const out = await robotList.execute({}, ctx) as typeof robots;

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/robots");
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(out.totalCount, 1);
  assertEquals(out.items[0].id, "r1");
});

Deno.test("robot-list: declares no params", () => {
  assertEquals(robotList.params, []);
});
