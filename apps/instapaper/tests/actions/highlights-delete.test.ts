import { assertEquals, assertRejects } from "@std/assert";
import highlightsDelete from "../../actions/highlights-delete.ts";
import { errorEnvelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("highlights-delete: calls the highlight-scoped delete path and tolerates the documented empty body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: undefined }]);
  const result = await highlightsDelete.execute({ highlightId: 7 }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/1.1/highlights/7/delete");
  assertEquals(result, { highlight_id: 7 });
});

Deno.test("highlights-delete: still surfaces the standard error envelope", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: errorEnvelope(1241, "Invalid or missing bookmark_id"),
  }]);
  await assertRejects(
    async () => await highlightsDelete.execute({ highlightId: 7 }, ctx),
    Error,
    "1241",
  );
});

Deno.test("highlights-delete: is marked idempotent", () => {
  assertEquals(highlightsDelete.idempotent, true);
});
