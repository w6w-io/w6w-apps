import { assertEquals } from "@std/assert";
import spaceUserList from "../../actions/space-user-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("space-user-list: GETs /space/user with pagination query", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: 1, firstName: "Ada" }]) }]);
  const out = await spaceUserList.execute({ limit: 50 }, ctx) as { items: unknown[] };

  assertEquals(pathOf(calls[0].url), "/v2/space/user");
  assertEquals(queryOf(calls[0].url), { limit: "50" });
  assertEquals(out.items.length, 1);
});

Deno.test("space-user-list: is safe to invoke with {} — it doubles as the health probe shape", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await spaceUserList.execute({}, ctx);
  assertEquals(queryOf(calls[0].url), {});
});
