import { assertEquals } from "@std/assert";
import animationTemplateCreate from "../../actions/animation-template-create.ts";
import { assertRejects, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("animation-template-create: POST /animation_templates, no config field sent", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { uid: "at1", name: "Promo" } }]);
  await animationTemplateCreate.execute(
    { name: "Promo", width: 1080, height: 1920, frameRate: 30 },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/animation_templates");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { name: "Promo", width: 1080, height: 1920, frame_rate: 30 });
  assertEquals("config" in body, false);
});

Deno.test("animation-template-create: requires a name", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() => animationTemplateCreate.execute({ name: "" }, ctx));
});
