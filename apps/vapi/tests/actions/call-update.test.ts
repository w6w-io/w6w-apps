import { assertEquals } from "@std/assert";
import callUpdate from "../../actions/call-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("call-update: PATCHes /call/{id} with only name", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "c1", name: "Follow-up" } }]);
  const out = await callUpdate.execute({ id: "c1", name: "Follow-up" }, ctx);

  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/call/c1");
  assertEquals(JSON.parse(calls[0].body!), { name: "Follow-up" });
  assertEquals(out, { id: "c1", name: "Follow-up" });
});

Deno.test("call-update: params expose only id and name — there is no other updatable field", () => {
  const keys = (callUpdate.params ?? []).map((p) => p.key).sort();
  assertEquals(keys, ["id", "name"]);
});
