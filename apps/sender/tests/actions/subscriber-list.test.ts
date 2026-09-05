import { assertEquals } from "@std/assert";
import subscriberList from "../../actions/subscriber-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("subscriber-list: GETs /v2/subscribers and keeps the meta/links envelope", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: "o1" }]) }]);
  const out = await subscriberList.execute({ limit: 20 }, ctx) as {
    data: unknown[];
    meta: unknown;
  };

  assertEquals(pathOf(calls[0].url), "/v2/subscribers");
  assertEquals(queryOf(calls[0].url), { limit: "20" });
  assertEquals(out.data, [{ id: "o1" }]);
  assertEquals(typeof out.meta, "object");
});
