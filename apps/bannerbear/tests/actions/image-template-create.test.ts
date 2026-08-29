import { assertEquals } from "@std/assert";
import imageTemplateCreate from "../../actions/image-template-create.ts";
import { assertRejects, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("image-template-create: POST /image_templates with compacted fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { uid: "t1", name: "Card" } }]);
  const out = await imageTemplateCreate.execute(
    { name: "Card", tags: "a, b", width: 1200, height: 630 },
    ctx,
  ) as unknown as Record<string, unknown>;

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/image_templates");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { name: "Card", tags: ["a", "b"], width: 1200, height: 630 });
  assertEquals(out.uid, "t1");
});

Deno.test("image-template-create: requires a name", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() => imageTemplateCreate.execute({ name: "" }, ctx));
});

Deno.test("image-template-create: not idempotent", () => {
  assertEquals(imageTemplateCreate.idempotent, false);
});
