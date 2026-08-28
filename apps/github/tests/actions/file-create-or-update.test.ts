import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/file-create-or-update.ts";

const BASE = { owner: "acme", repository: "api", filePath: "a.txt", content: "aGk=" };

Deno.test("file-create-or-update: omitting the SHA creates the file", async () => {
  const { ctx, calls } = mockCtx([{ body: { commit: {} } }]);
  await action.execute({ ...BASE, commitMessage: "add a.txt" }, ctx);
  assertEquals(calls[0].method, "PUT");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { message: "add a.txt", content: "aGk=" });
  assertEquals("sha" in body, false);
});

Deno.test("file-create-or-update: supplying the SHA makes it a compare-and-set update", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ ...BASE, commitMessage: "edit", sha: "abc123", branch: "main" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    message: "edit",
    content: "aGk=",
    sha: "abc123",
    branch: "main",
  });
});

Deno.test("file-create-or-update: a nested path renders as real segments, each percent-encoded", async () => {
  const { ctx, calls } = mockCtx([{ body: { commit: {} } }]);
  await action.execute(
    { ...BASE, filePath: "cfg/documents/a.md", commitMessage: "add" },
    ctx,
  );
  assertEquals(
    calls[0].url,
    "https://api.github.com/repos/acme/api/contents/cfg/documents/a.md",
  );
});
