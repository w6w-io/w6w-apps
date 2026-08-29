import { assertEquals } from "@std/assert";
import animationTemplateGet from "../../actions/animation-template-get.ts";
import { assertRejects, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("animation-template-get: GET /animation_templates/{uid}", async () => {
  const { ctx, calls } = mockCtx([{ body: { uid: "at1", frame_rate: 24 } }]);
  const out = await animationTemplateGet.execute({ uid: "at1" }, ctx) as unknown as Record<
    string,
    unknown
  >;

  assertEquals(pathOf(calls[0].url), "/animation_templates/at1");
  assertEquals(out.frame_rate, 24);
});

Deno.test("animation-template-get: requires uid", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() => animationTemplateGet.execute({ uid: "" }, ctx));
});
