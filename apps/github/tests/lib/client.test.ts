import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { compact, contentsPath, csv, GitHubClient, repoPath, unset } from "../../lib/client.ts";

Deno.test("client: sends the pinned API version and JSON accept header", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  await new GitHubClient(ctx).request("/repos/acme/api");
  assertEquals(calls[0].url, "https://api.github.com/repos/acme/api");
  assertEquals(calls[0].headers["accept"], "application/vnd.github+json");
  assertEquals(calls[0].headers["x-github-api-version"], "2022-11-28");
  assertEquals("authorization" in calls[0].headers, false);
});

Deno.test("client: surfaces GitHub's error body, which names the offending field", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    statusText: "Unprocessable Entity",
    body: '{"message":"Validation Failed","errors":[{"field":"title"}]}',
  }]);
  await assertRejects(
    () => new GitHubClient(ctx).request("/repos/acme/api/issues", { method: "POST", body: {} }),
    Error,
    "Validation Failed",
  );
});

Deno.test("client: returns undefined for GitHub's 204 responses", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(
    await new GitHubClient(ctx).request("/repos/acme/api/issues/1/lock", { method: "PUT" }),
    undefined,
  );
});

Deno.test("client: compact keeps false/0 but drops unset fields", () => {
  assertEquals(compact({ draft: false, n: 0, a: undefined, b: null }), { draft: false, n: 0 });
});

Deno.test("csv: splits, trims and drops blanks; an empty field stays unset", () => {
  assertEquals(csv("a, b ,,c"), ["a", "b", "c"]);
  assertEquals(csv(""), undefined);
  assertEquals(csv(undefined), undefined);
  assertEquals(csv(" , "), undefined);
});

Deno.test("unset: a blank form field is absent", () => {
  assertEquals(unset(""), undefined);
  assertEquals(unset("x"), "x");
});

Deno.test("repoPath: encodes both segments so neither can escape the path", () => {
  assertEquals(repoPath("acme", "api"), "acme/api");
  assertEquals(repoPath("a/b", "c d"), "a%2Fb/c%20d");
});

Deno.test("contentsPath: throws for every empty, '.', '..' or leading-'/' segment", () => {
  const illegal = [
    "../x",
    "a/../b",
    "a/./b",
    "/a",
    "a//b",
    "a/",
    ".",
    "..",
    "../../../../user",
  ];
  let thrown = 0;
  for (const path of illegal) {
    try {
      contentsPath(path);
    } catch {
      thrown++;
    }
  }
  assertEquals(thrown, illegal.length);
  for (const path of illegal) {
    assertThrows(() => contentsPath(path));
  }
});

Deno.test("contentsPath: a legal single-directory path renders unchanged", () => {
  assertEquals(contentsPath("src/index.ts"), "src/index.ts");
});

Deno.test("contentsPath: each segment is percent-encoded, real slashes preserved", () => {
  assertEquals(contentsPath("docs/a b.md"), "docs/a%20b.md");
});

Deno.test("contentsPath: a single-segment path still works", () => {
  assertEquals(contentsPath("a.txt"), "a.txt");
});

Deno.test("contentsPath: a literal percent in a segment is re-encoded, never decoded first", () => {
  assertEquals(contentsPath("docs/%2e%2e/x"), "docs/%252e%252e/x");
});

Deno.test("contentsPath: nested via repoPath — repoPath itself is unchanged", () => {
  assertEquals(repoPath("a c", "b/d"), "a%20c/b%2Fd");
});
