import { assertEquals } from "@std/assert";
import keyDelete from "../../actions/key-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("key-delete: DELETEs a key and returns the raw success shape", async () => {
  const { ctx, calls } = mockCtx([
    { body: { project_id: "p1", key_removed: true, keys_locked: 0 } },
  ]);
  const out = await keyDelete.execute({ projectId: "p1", keyId: 1 }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api2/projects/p1/keys/1");
  assertEquals(out, { project_id: "p1", key_removed: true, keys_locked: 0 });
});

/**
 * The documented Lokalise example: a 200 whose key was NOT removed because
 * it is locked. This must be surfaced, not swallowed as a generic success.
 */
Deno.test("key-delete: a locked key surfaces key_removed:false despite a 200 status", async () => {
  const { ctx } = mockCtx([
    { body: { project_id: "p1", key_removed: false, keys_locked: 1 } },
  ]);
  const out = await keyDelete.execute({ projectId: "p1", keyId: 1 }, ctx) as {
    key_removed: boolean;
    keys_locked: number;
  };
  assertEquals(out.key_removed, false);
  assertEquals(out.keys_locked, 1);
});

Deno.test("key-delete: is idempotent", () => {
  assertEquals(keyDelete.idempotent, true);
});
