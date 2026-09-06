import { assertEquals } from "@std/assert";
import classifierDelete from "../../actions/classifier-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("classifier-delete: calls DELETE /v1/classifiers/{id} and reports deleted", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { deleted: true } }]);
  const out = await classifierDelete.execute({ classifierId: "clf-1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/classifiers/clf-1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { deleted: true });
});

Deno.test("classifier-delete: escapes the classifier id in the path", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await classifierDelete.execute({ classifierId: "a/b c" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/classifiers/a%2Fb%20c");
});
