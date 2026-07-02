import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-workspaces.ts";

Deno.test("list-workspaces: hits /user/workspaces with default pagelen", async () => {
  const { ctx, calls } = mockCtx([{ body: { values: [], pagelen: 100 } }]);
  await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/2.0/user/workspaces");
  assertEquals(url.searchParams.get("pagelen"), "100");
});

Deno.test("list-workspaces: forwards all optional filters", async () => {
  const { ctx, calls } = mockCtx([{ body: { values: [] } }]);
  await action.execute(
    { role: "owner", q: "slug=\"x\"", sort: "name", page: 3, pagelen: 25 },
    ctx,
  );
  const params = new URL(calls[0].url).searchParams;
  assertEquals(params.get("role"), "owner");
  assertEquals(params.get("q"), "slug=\"x\"");
  assertEquals(params.get("sort"), "name");
  assertEquals(params.get("page"), "3");
  assertEquals(params.get("pagelen"), "25");
});

Deno.test("list-workspaces: omits undefined optionals", async () => {
  const { ctx, calls } = mockCtx([{ body: { values: [] } }]);
  await action.execute({}, ctx);
  const params = new URL(calls[0].url).searchParams;
  assert(!params.has("role"));
  assert(!params.has("q"));
  assert(!params.has("sort"));
  assert(!params.has("page"));
});
