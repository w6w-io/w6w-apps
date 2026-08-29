import { assertEquals } from "@std/assert";
import animationGet from "../../actions/animation-get.ts";
import { assertRejects, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("animation-get: GET /animations/{uid}, carries progress", async () => {
  const { ctx, calls } = mockCtx([{ body: { uid: "a1", status: "rendering", progress: 40 } }]);
  const out = await animationGet.execute({ uid: "a1" }, ctx) as unknown as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/animations/a1");
  assertEquals(out.progress, 40);
});

Deno.test("animation-get: requires uid", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() => animationGet.execute({ uid: "" }, ctx));
});
