import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/booking-reassign.ts";

Deno.test("booking-reassign: POSTs new_host without a location override by default", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "BKNG-1" } }]);
  await action.execute({ id: "BKNG-1", newHost: "USR-2" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/bookings/BKNG-1/reassign");
  assertEquals(JSON.parse(calls[0].body!), { new_host: "USR-2" });
});

Deno.test("booking-reassign: wraps a location override as { type: virtual, value }", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ id: "BKNG-1", newHost: "USR-2", locationValue: "zoom" }, ctx);
  assertEquals(
    JSON.parse(calls[0].body!),
    { new_host: "USR-2", location: { type: "virtual", value: "zoom" } },
  );
});
