import { assertEquals } from "@std/assert";
import matterUpdate from "../../actions/matter-update.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("matter-update: PATCHes /matters/{id}.json with only the set fields", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 5, status: "closed" }) }]);
  await matterUpdate.execute({ id: 5, status: "closed" }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/api/v4/matters/5.json");
  assertEquals(JSON.parse(calls[0].body!), { data: { status: "closed" } });
});

Deno.test("matter-update: is declared idempotent (a partial patch by id)", () => {
  assertEquals(matterUpdate.idempotent, true);
});
