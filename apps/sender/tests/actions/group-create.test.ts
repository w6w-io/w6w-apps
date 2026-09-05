import { assertEquals } from "@std/assert";
import groupCreate from "../../actions/group-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("group-create: POSTs to /v2/groups", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "g1", title: "My Group" } } }]);
  const out = await groupCreate.execute({ title: "My Group" }, ctx) as { id: string };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/groups");
  assertEquals(JSON.parse(calls[0].body!), { title: "My Group" });
  assertEquals(out.id, "g1");
});
