import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/file-delete.ts";

Deno.test("file-delete: DELETEs the contents route with the required SHA", async () => {
  const { ctx, calls } = mockCtx([{ body: { commit: {} } }]);
  await action.execute(
    { owner: "acme", repository: "api", filePath: "a.txt", commitMessage: "rm", sha: "abc" },
    ctx,
  );
  assertEquals(calls[0].method, "DELETE");
  assertEquals(JSON.parse(calls[0].body!), { message: "rm", sha: "abc" });
});

Deno.test("file-delete: the SHA is required — GitHub will not delete without it", () => {
  assert(action.params?.find((p) => p.key === "sha")?.required);
});

Deno.test("file-delete: a nested path renders as real segments, each percent-encoded", async () => {
  const { ctx, calls } = mockCtx([{ body: { commit: {} } }]);
  await action.execute(
    {
      owner: "acme",
      repository: "api",
      filePath: "cfg/documents/a.md",
      commitMessage: "rm",
      sha: "abc",
    },
    ctx,
  );
  assertEquals(
    calls[0].url,
    "https://api.github.com/repos/acme/api/contents/cfg/documents/a.md",
  );
});
