import { assertEquals } from "@std/assert";
import userAvailabilityGet from "../../actions/user-availability-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

/**
 * The response is a bare `{"availability": "…"}` with no id in it, so the action
 * has to carry the caller's own id through or the result is unattributable.
 */
Deno.test("user-availability-get: returns the availability alongside the user id", async () => {
  const { ctx, calls } = mockCtx([{ body: { availability: "after_call_work" } }]);
  const out = await userAvailabilityGet.execute({ userId: "456" }, ctx) as {
    userId: string;
    availability: string;
  };

  assertEquals(pathOf(calls[0].url), "/v1/users/456/availability");
  assertEquals(out.availability, "after_call_work");
  assertEquals(out.userId, "456");
});
