import { assertEquals, assertRejects } from "@std/assert";
import repoBlocklistUpsert from "../../actions/repo-blocklist-upsert.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const repos = [{ url: "https://github.com/co/repo", patterns: ["*.env", "secrets/**"] }];

Deno.test("repo-blocklist-upsert: posts the repos array", async () => {
  const { ctx, calls } = mockCtx([
    { body: { repos: [{ id: "repo_123", url: repos[0].url, patterns: repos[0].patterns }] } },
  ]);
  await repoBlocklistUpsert.execute({ repos }, ctx);
  assertEquals(pathOf(calls[0].url), "/settings/repo-blocklists/repos/upsert");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { repos });
});

Deno.test("repo-blocklist-upsert: accepts a JSON string", async () => {
  const { ctx, calls } = mockCtx([{ body: { repos: [] } }]);
  await repoBlocklistUpsert.execute({ repos: JSON.stringify(repos) }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { repos });
});

Deno.test("repo-blocklist-upsert: rejects an empty repos array", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(async () => await repoBlocklistUpsert.execute({ repos: [] }, ctx));
});
