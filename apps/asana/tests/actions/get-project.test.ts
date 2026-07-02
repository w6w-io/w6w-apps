import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-project.ts";

Deno.test("get-project: GETs /projects/{id}", async () => {
  const body = { data: { gid: "p-1" } };
  const { ctx, calls } = mockCtx([{ body }]);
  const out = await action.execute({ id: "p-1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/1.0/projects/p-1");
  assertEquals(out, body);
});

Deno.test("get-project: forwards opt_fields when set, omits when undefined", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }, { body: { data: {} } }]);
  await action.execute({ id: "p-1", opt_fields: "gid" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("opt_fields"), "gid");
  await action.execute({ id: "p-1" }, ctx);
  assert(!new URL(calls[1].url).searchParams.has("opt_fields"));
});
