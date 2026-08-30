import { assertEquals } from "@std/assert";
import formDelete from "../../actions/form-delete.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("form-delete: defaults soft_delete to true (the vendor's own default)", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await formDelete.execute({ formId: "f1" }, ctx) as { status: number };
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/forms/f1");
  assertEquals(queryOf(calls[0].url).soft_delete, "true");
  assertEquals(out.status, 204);
});

Deno.test("form-delete: soft_delete can be set to false for a permanent delete", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await formDelete.execute({ formId: "f1", softDelete: false }, ctx);
  assertEquals(queryOf(calls[0].url).soft_delete, "false");
});
