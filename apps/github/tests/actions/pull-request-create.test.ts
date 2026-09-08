import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/pull-request-create.ts";

Deno.test("pull-request-create: POSTs /repos/{owner}/{repo}/pulls with head/base/title", async () => {
  const { ctx, calls } = mockCtx([{ body: { number: 42 } }]);
  await action.execute(
    { owner: "acme", repository: "api", title: "Add feature", head: "feat", base: "main" },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.github.com/repos/acme/api/pulls");
  assertEquals(JSON.parse(calls[0].body!), { title: "Add feature", head: "feat", base: "main" });
});

Deno.test("pull-request-create: forwards body, draft and maintainerCanModify", async () => {
  const { ctx, calls } = mockCtx([{ body: { number: 42 } }]);
  await action.execute(
    {
      owner: "acme",
      repository: "api",
      title: "Add feature",
      head: "feat",
      base: "main",
      body: "Description",
      draft: true,
      maintainerCanModify: false,
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.body, "Description");
  assertEquals(body.draft, true);
  assertEquals(body.maintainer_can_modify, false);
});

Deno.test("pull-request-create: is not idempotent — a retry opens a duplicate", () => {
  assertEquals(action.idempotent, false);
});
