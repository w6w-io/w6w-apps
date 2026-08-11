import { assert, assertEquals, assertRejects } from "@std/assert";
import userCallStart from "../../actions/user-call-start.ts";
import { appErrorBody, bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("user-call-start: POSTs /v1/users/{id}/calls with number_id and to", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await userCallStart.execute(
    { userId: "456", numberId: "1234", to: "+18001231234" },
    ctx,
  ) as { status: number };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/users/456/calls");
  // `number_id` is documented as an Integer; sending "1234" as a string is the
  // kind of thing a strict body validator rejects.
  assertEquals(bodyOf(calls[0]), { number_id: 1234, to: "+18001231234" });
  assertEquals(out.status, 204);
});

/**
 * 405 here means "User not available", not "wrong verb" — the single most
 * misread status on this endpoint.
 */
Deno.test("user-call-start: a 405 is explained as user-unavailable, not wrong-verb", async () => {
  const { ctx } = mockCtx([
    { status: 405, body: appErrorBody("Method Not Allowed", "User not available") },
  ]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        userCallStart.execute({ userId: "456", numberId: "1234", to: "+18001231234" }, ctx),
      ),
    Error,
  );
  assert(err.message.includes("state error"), err.message);
  assert(err.message.includes("user unavailable"), err.message);
});
