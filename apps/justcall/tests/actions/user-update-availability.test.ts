import { assertEquals } from "@std/assert";
import userUpdateAvailability from "../../actions/user-update-availability.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("user-update-availability: PUTs to /v2.1/users/availability", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success" } }]);
  await userUpdateAvailability.execute({
    agent_id: 1,
    is_available: false,
    unavailability_reason: "Lunch",
  }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2.1/users/availability");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), {
    agent_id: 1,
    is_available: false,
    unavailability_reason: "Lunch",
  });
});
