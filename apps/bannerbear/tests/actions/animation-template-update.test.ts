import { assertEquals } from "@std/assert";
import animationTemplateUpdate from "../../actions/animation-template-update.ts";
import { assertRejects, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("animation-template-update: PATCH /animation_templates/{uid}", async () => {
  const { ctx, calls } = mockCtx([{ body: { uid: "at1", name: "Renamed" } }]);
  await animationTemplateUpdate.execute({ uid: "at1", name: "Renamed" }, ctx);

  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/animation_templates/at1");
  assertEquals(JSON.parse(calls[0].body!), { name: "Renamed" });
});

Deno.test("animation-template-update: requires uid", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() => animationTemplateUpdate.execute({ uid: "" }, ctx));
});
