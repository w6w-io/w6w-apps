import { assertEquals } from "@std/assert";
import repoBlocklistDelete from "../../actions/repo-blocklist-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("repo-blocklist-delete: DELETEs by id and returns deleted: true on 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await repoBlocklistDelete.execute({ repoId: "repo_123" }, ctx);
  assertEquals(pathOf(calls[0].url), "/settings/repo-blocklists/repos/repo_123");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { deleted: true });
});

Deno.test("repo-blocklist-delete: path-escapes the id", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await repoBlocklistDelete.execute({ repoId: "repo/weird id" }, ctx);
  assertEquals(pathOf(calls[0].url), "/settings/repo-blocklists/repos/repo%2Fweird%20id");
});
