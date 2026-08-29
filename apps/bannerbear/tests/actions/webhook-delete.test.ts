import { assertEquals } from "@std/assert";
import webhookDelete from "../../actions/webhook-delete.ts";
import { assertRejects, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-delete: DELETE /webhooks/{uid}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: undefined }]);
  const out = await webhookDelete.execute({ uid: "w1" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/webhooks/w1");
  assertEquals(out, { uid: "w1", deleted: true });
});

Deno.test("webhook-delete: requires uid", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() => webhookDelete.execute({ uid: "" }, ctx));
});
