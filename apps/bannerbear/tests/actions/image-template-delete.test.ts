import { assertEquals } from "@std/assert";
import imageTemplateDelete from "../../actions/image-template-delete.ts";
import { assertRejects, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("image-template-delete: DELETE /image_templates/{uid}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: undefined }]);
  const out = await imageTemplateDelete.execute({ uid: "t1" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/image_templates/t1");
  assertEquals(out, { uid: "t1", deleted: true });
});

Deno.test("image-template-delete: requires uid", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() => imageTemplateDelete.execute({ uid: "" }, ctx));
});
