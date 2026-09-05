import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-design-export-formats.ts";

Deno.test("get-design-export-formats: GETs /rest/v1/designs/{id}/export-formats", async () => {
  const { ctx, calls } = mockCtx([{ body: { formats: { pdf: {} } } }]);
  const result = await action.execute({ designId: "abc123" }, ctx) as { formats: unknown };
  assertEquals(new URL(calls[0].url).pathname, "/rest/v1/designs/abc123/export-formats");
  assertEquals(result.formats, { pdf: {} });
});
