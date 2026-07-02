import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-workspace-hooks.ts";

Deno.test("list-workspace-hooks: GETs /workspaces/{workspace}/hooks", async () => {
  const { ctx, calls } = mockCtx([{ body: { values: [] } }]);
  await action.execute({ workspace: "acme" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/2.0/workspaces/acme/hooks");
  assertEquals(new URL(calls[0].url).searchParams.get("pagelen"), "100");
});

Deno.test("list-workspace-hooks: forwards page + pagelen", async () => {
  const { ctx, calls } = mockCtx([{ body: { values: [] } }]);
  await action.execute({ workspace: "acme", page: 2, pagelen: 5 }, ctx);
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.get("page"), "2");
  assertEquals(p.get("pagelen"), "5");
});
