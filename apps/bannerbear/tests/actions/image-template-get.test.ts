import { assertEquals } from "@std/assert";
import imageTemplateGet from "../../actions/image-template-get.ts";
import { assertRejects, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("image-template-get: GET /image_templates/{uid}", async () => {
  const { ctx, calls } = mockCtx([
    { body: { uid: "t1", name: "Card", config: { objects: [{ name: "title" }] } } },
  ]);
  const out = await imageTemplateGet.execute({ uid: "t1" }, ctx) as unknown as Record<
    string,
    unknown
  >;

  assertEquals(pathOf(calls[0].url), "/image_templates/t1");
  assertEquals(out.name, "Card");
});

Deno.test("image-template-get: requires uid", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() => imageTemplateGet.execute({ uid: "" }, ctx));
});
