import { assertEquals } from "@std/assert";
import templateDelete from "../../actions/template-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("template-delete: DELETEs /templates/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await templateDelete.execute({ id: 519 }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v2/templates/519");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { status: 204 });
});
