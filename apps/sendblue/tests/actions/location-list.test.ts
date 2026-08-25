import { assertEquals } from "@std/assert";
import locationList from "../../actions/location-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("location-list: GETs /api/location with from_number", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "OK", locations: [] } }]);
  await locationList.execute({ fromNumber: "+1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/location");
  assertEquals(queryOf(calls[0].url), { from_number: "+1" });
});
