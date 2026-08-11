import { assertEquals } from "@std/assert";
import customFieldDelete from "../../actions/custom-field-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("custom-field-delete: DELETEs /beta/workspaces/{id}/custom-fields/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await customFieldDelete.execute({ workspaceId: "ws1", id: "cf1" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/beta/workspaces/ws1/custom-fields/cf1");
  assertEquals(calls[0].body, null);
  assertEquals(out, { id: "cf1", status: 204 });
});

Deno.test("custom-field-delete: both ids are path-escaped", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await customFieldDelete.execute({ workspaceId: "a/b", id: "c/d" }, ctx);
  assertEquals(pathOf(calls[0].url), "/beta/workspaces/a%2Fb/custom-fields/c%2Fd");
  assertEquals(customFieldDelete.idempotent, true);
});
