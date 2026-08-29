import { assertEquals } from "@std/assert";
import animationTemplateList from "../../actions/animation-template-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("animation-template-list: GET /animation_templates", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ uid: "at1", frame_rate: 30 }] }]);
  const out = await animationTemplateList.execute({}, ctx) as unknown[];

  assertEquals(pathOf(calls[0].url), "/animation_templates");
  assertEquals(out, [{ uid: "at1", frame_rate: 30 }]);
});
