import { assertEquals } from "@std/assert";
import highlightDelete from "../../actions/highlight-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("highlight-delete: DELETEs and reports the 204 status", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await highlightDelete.execute({ highlightId: "13" }, ctx) as { status: number };

  assertEquals(pathOf(calls[0].url), "/api/v2/highlights/13/");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out.status, 204);
});

Deno.test("highlight-delete: is idempotent — the end state is the same either way", () => {
  assertEquals(highlightDelete.idempotent, true);
});
