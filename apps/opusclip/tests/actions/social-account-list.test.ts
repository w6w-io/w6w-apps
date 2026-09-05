import { assertEquals } from "@std/assert";
import socialAccountList from "../../actions/social-account-list.ts";
import { envelope, mockCtx, queryOf } from "../_helpers.ts";

Deno.test("social-account-list: GETs q=mine and unwraps the data envelope", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: envelope([{ postAccountId: "pa1", platform: "YOUTUBE" }]) },
  ]);
  const out = await socialAccountList.execute({}, ctx) as { items: unknown[] };

  assertEquals(queryOf(calls[0].url), { q: "mine" });
  assertEquals(out.items.length, 1);
});
