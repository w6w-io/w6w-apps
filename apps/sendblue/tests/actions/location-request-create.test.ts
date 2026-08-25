import { assertEquals } from "@std/assert";
import locationRequestCreate from "../../actions/location-request-create.ts";
import { jsonBodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("location-request-create: POSTs to /api/request-location", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "QUEUED", message_handle: "m1" } }]);
  await locationRequestCreate.execute({ fromNumber: "+1", number: "+2" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/request-location");
  assertEquals(jsonBodyOf(calls[0]), { from_number: "+1", number: "+2" });
});
