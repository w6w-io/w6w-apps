import { assertEquals } from "@std/assert";
import boxGet from "../../actions/box-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("box-get: calls GET /boxes/{boxKey}", async () => {
  const { ctx, calls } = mockCtx([{ body: { name: "MySampleBox" } }]);
  await boxGet.execute({ boxKey: "b1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v1/boxes/b1");
});
