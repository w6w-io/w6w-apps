import { assertEquals } from "@std/assert";
import pathwayDelete from "../../actions/pathway-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("pathway-delete: sends DELETE to /v1/pathway/{id}", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { status: "success", message: "Pathway deleted successfully" },
  }]);
  const out = await pathwayDelete.execute({ pathwayId: "p-1" }, ctx) as Record<string, unknown>;
  assertEquals(pathOf(calls[0].url), "/v1/pathway/p-1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out.message, "Pathway deleted successfully");
});

Deno.test("pathway-delete: is declared idempotent", () => {
  assertEquals(pathwayDelete.idempotent, true);
});
