import { assertEquals } from "@std/assert";
import userAvailabilityList from "../../actions/user-availability-list.ts";
import { listBody, mockCtx, pathOf } from "../_helpers.ts";

/**
 * v1 on purpose: Aircall's v2 User surface publishes no availability endpoint at
 * all, so the v1 deprecation banner offers no migration target here. Pinning the
 * prefix stops a well-meant "migrate everything to v2" from 404-ing.
 */
Deno.test("user-availability-list: reads GET /v1/users/availabilities", async () => {
  const { ctx, calls } = mockCtx([
    { body: listBody("users", [{ id: 456, availability: "available" }]) },
  ]);
  const out = await userAvailabilityList.execute({}, ctx) as {
    items: Array<{ availability: string }>;
  };

  assertEquals(pathOf(calls[0].url), "/v1/users/availabilities");
  assertEquals(out.items[0].availability, "available");
});
