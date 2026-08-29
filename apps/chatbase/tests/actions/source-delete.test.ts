import { assertEquals } from "@std/assert";
import sourceDelete from "../../actions/source-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("source-delete: DELETE .../sources/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "s1", status: "toBeDeleted" } }]);
  const out = await sourceDelete.execute({ agentId: "a1", sourceId: "s1" }, ctx) as {
    status: string;
  };

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/v2/agents/a1/sources/s1");
  assertEquals(out.status, "toBeDeleted");
});
