import { assertEquals } from "@std/assert";
import repoBlocklistList from "../../actions/repo-blocklist-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("repo-blocklist-list: calls GET /settings/repo-blocklists/repos", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: { repos: [{ id: "repo_123", url: "https://github.com/co/repo", patterns: ["*.env"] }] },
    },
  ]);
  const out = await repoBlocklistList.execute({}, ctx) as { repos: unknown[] };
  assertEquals(pathOf(calls[0].url), "/settings/repo-blocklists/repos");
  assertEquals(out.repos.length, 1);
});
