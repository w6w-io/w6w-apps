import { assertEquals } from "@std/assert";
import locationList from "../../actions/location-list.ts";
import { mockCtx, odataList, pathOf } from "../_helpers.ts";

Deno.test("location-list: calls GET /v1/Locations", async () => {
  const { ctx, calls } = mockCtx([{ body: odataList([{ id: "l1" }]) }]);
  const out = await locationList.execute({}, ctx) as { items: unknown[] };
  assertEquals(pathOf(calls[0].url), "/v1/Locations");
  assertEquals(out.items, [{ id: "l1" }]);
});
