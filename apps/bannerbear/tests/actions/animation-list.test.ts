import { assertEquals } from "@std/assert";
import animationList from "../../actions/animation-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("animation-list: GET /animations", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ uid: "a1" }] }]);
  const out = await animationList.execute({}, ctx) as unknown[];

  assertEquals(pathOf(calls[0].url), "/animations");
  assertEquals(out, [{ uid: "a1" }]);
});
