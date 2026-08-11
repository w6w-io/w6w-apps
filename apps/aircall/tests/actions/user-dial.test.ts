import { assertEquals } from "@std/assert";
import userCallStart from "../../actions/user-call-start.ts";
import userDial from "../../actions/user-dial.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("user-dial: POSTs /v1/users/{id}/dial with only the number", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await userDial.execute({ userId: "456", to: "+18001231234" }, ctx) as {
    status: number;
  };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/users/456/dial");
  // No `number_id`: the agent picks the line. That is the whole difference from
  // Start Outbound Call.
  assertEquals(bodyOf(calls[0]), { to: "+18001231234" });
  assertEquals(out.status, 204);
});

/**
 * The two click-to-* endpoints look interchangeable and are not: one fills a
 * text field, the other rings a phone and bills a minute. The retry policy has
 * to tell them apart or a dropped response places a second real call.
 */
Deno.test("user-dial is retryable and user-call-start is not", () => {
  assertEquals(userDial.idempotent, true);
  assertEquals(userCallStart.idempotent, false);
});
