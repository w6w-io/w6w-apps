import { assertEquals } from "@std/assert";
import locationGet from "../../actions/location-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("location-get: GETs /api/location/{number} with from_number as a query param", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "OK", location: {} } }]);
  await locationGet.execute({ number: "+2", fromNumber: "+1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/location/%2B2");
  assertEquals(queryOf(calls[0].url), { from_number: "+1" });
});
