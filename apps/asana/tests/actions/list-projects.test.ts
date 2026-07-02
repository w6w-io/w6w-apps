import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-projects.ts";

Deno.test("list-projects: uses workspace query when team is not set", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute({ workspace: "ws-1" }, ctx);
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.get("workspace"), "ws-1");
  assertEquals(p.get("limit"), "100");
  assert(!p.has("team"));
});

Deno.test("list-projects: switches to team query when team is set (drops workspace)", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute({ workspace: "ws-1", team: "team-9" }, ctx);
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.get("team"), "team-9");
  assert(!p.has("workspace"));
});

Deno.test("list-projects: forwards archived / limit / offset / opt_fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute({
    workspace: "ws-1",
    archived: true,
    limit: 25,
    offset: "cur",
    opt_fields: "gid,name",
  }, ctx);
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.get("archived"), "true");
  assertEquals(p.get("limit"), "25");
  assertEquals(p.get("offset"), "cur");
  assertEquals(p.get("opt_fields"), "gid,name");
});
