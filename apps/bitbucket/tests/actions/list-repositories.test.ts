import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-repositories.ts";

Deno.test("list-repositories: hits /repositories/{workspace} with default pagelen", async () => {
  const { ctx, calls } = mockCtx([{ body: { values: [] } }]);
  await action.execute({ workspace: "acme" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/2.0/repositories/acme");
  assertEquals(url.searchParams.get("pagelen"), "100");
});

Deno.test("list-repositories: forwards all optional filters", async () => {
  const { ctx, calls } = mockCtx([{ body: { values: [] } }]);
  await action.execute(
    { workspace: "acme", role: "admin", q: "name~\"api\"", sort: "-updated_on", page: 2, pagelen: 10 },
    ctx,
  );
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.get("role"), "admin");
  assertEquals(p.get("q"), "name~\"api\"");
  assertEquals(p.get("sort"), "-updated_on");
  assertEquals(p.get("page"), "2");
  assertEquals(p.get("pagelen"), "10");
});

Deno.test("list-repositories: omits undefined optionals", async () => {
  const { ctx, calls } = mockCtx([{ body: { values: [] } }]);
  await action.execute({ workspace: "acme" }, ctx);
  const p = new URL(calls[0].url).searchParams;
  assert(!p.has("role"));
  assert(!p.has("q"));
  assert(!p.has("sort"));
  assert(!p.has("page"));
});
