import { assert, assertEquals } from "@std/assert";
import tagDelete from "../../actions/tag-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("tag-delete: DELETEs /v1/tags/{id} and warns about the blast radius", async () => {
  const { ctx, calls, logs } = mockCtx([{ status: 204 }]);
  const out = await tagDelete.execute({ tagId: "681" }, ctx) as { status: number };

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/tags/681");
  assertEquals(out.status, 204);
  // Deleting a Tag also strips it from every Call that carried it.
  assertEquals(logs[0].level, "warn");
  assert(logs[0].message.includes("every call"), logs[0].message);
});
