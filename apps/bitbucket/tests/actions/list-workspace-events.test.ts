import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-workspace-events.ts";

Deno.test("list-workspace-events: GETs /hook_events/workspace", async () => {
  const { ctx, calls } = mockCtx([{ body: { values: [] } }]);
  await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/2.0/hook_events/workspace");
  assertEquals(new URL(calls[0].url).searchParams.get("pagelen"), "100");
});

Deno.test("list-workspace-events: forwards page + pagelen", async () => {
  const { ctx, calls } = mockCtx([{ body: { values: [] } }]);
  await action.execute({ page: 2, pagelen: 10 }, ctx);
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.get("page"), "2");
  assertEquals(p.get("pagelen"), "10");
});
