import { assertEquals } from "@std/assert";
import imageTemplateUpdate from "../../actions/image-template-update.ts";
import { assertRejects, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("image-template-update: PATCH /image_templates/{uid}, config passed through as-is", async () => {
  const { ctx, calls } = mockCtx([{ body: { uid: "t1", name: "New name" } }]);
  await imageTemplateUpdate.execute(
    { uid: "t1", name: "New name", config: { objects: [{ name: "title", text: "Hi" }] } },
    ctx,
  );

  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/image_templates/t1");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.name, "New name");
  assertEquals(body.config, { objects: [{ name: "title", text: "Hi" }] });
});

Deno.test("image-template-update: requires uid", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() => imageTemplateUpdate.execute({ uid: "" }, ctx));
});

Deno.test("image-template-update: idempotent", () => {
  assertEquals(imageTemplateUpdate.idempotent, true);
});
