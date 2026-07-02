import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-repository-hooks.ts";

Deno.test("list-repository-hooks: GETs /repositories/{workspace}/{repo_slug}/hooks", async () => {
  const { ctx, calls } = mockCtx([{ body: { values: [] } }]);
  await action.execute({ workspace: "acme", repoSlug: "backend" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    new URL(calls[0].url).pathname,
    "/2.0/repositories/acme/backend/hooks",
  );
  assertEquals(new URL(calls[0].url).searchParams.get("pagelen"), "100");
});

Deno.test("list-repository-hooks: forwards page + pagelen", async () => {
  const { ctx, calls } = mockCtx([{ body: { values: [] } }]);
  await action.execute(
    { workspace: "acme", repoSlug: "backend", page: 3, pagelen: 7 },
    ctx,
  );
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.get("page"), "3");
  assertEquals(p.get("pagelen"), "7");
});
