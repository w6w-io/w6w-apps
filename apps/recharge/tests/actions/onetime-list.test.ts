import { assertEquals } from "@std/assert";
import onetimeList from "../../actions/onetime-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("onetime-list: hits GET /onetimes with include_cancelled", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope("onetimes", [{ id: 1 }]) }]);
  const out = await onetimeList.execute({ includeCancelled: true }, ctx) as { items: unknown[] };
  assertEquals(pathOf(calls[0].url), "/onetimes");
  assertEquals(queryOf(calls[0].url), { include_cancelled: "true" });
  assertEquals(out.items, [{ id: 1 }]);
});
