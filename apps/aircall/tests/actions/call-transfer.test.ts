import { assert, assertEquals, assertRejects } from "@std/assert";
import callTransfer from "../../actions/call-transfer.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("call-transfer: POSTs /v1/calls/{id}/transfers with a user destination", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await callTransfer.execute({ callId: "812", userId: "456" }, ctx) as {
    status: number;
  };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/calls/812/transfers");
  assertEquals(bodyOf(calls[0]), { user_id: "456" });
  assertEquals(out.status, 204);
});

/**
 * "Only one of user_id, team_id or number parameters are allowed for each
 * request" — a documented 400. Caught here so the failure names the mistake.
 */
Deno.test("call-transfer: two destinations are rejected before the request", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(
    () =>
      Promise.resolve(callTransfer.execute({ callId: "812", userId: "456", teamId: "678" }, ctx)),
    Error,
  );
  assert(err.message.includes("exactly one destination"), err.message);
  assertEquals(calls.length, 0, "no request should have been made");
});

Deno.test("call-transfer: zero destinations are rejected before the request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(callTransfer.execute({ callId: "812" }, ctx)),
    Error,
  );
  assertEquals(calls.length, 0);
});

/**
 * `dispatching_strategy` is Team-only; pairing it with a user or an external
 * number is its own documented 400.
 */
Deno.test("call-transfer: dispatching strategy is sent for a team", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await callTransfer.execute(
    { callId: "812", teamId: "678", dispatchingStrategy: "longest_idle" },
    ctx,
  );
  assertEquals(bodyOf(calls[0]), { team_id: "678", dispatching_strategy: "longest_idle" });
});

Deno.test("call-transfer: dispatching strategy is dropped for a user destination", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await callTransfer.execute(
    { callId: "812", userId: "456", dispatchingStrategy: "random" },
    ctx,
  );
  assertEquals(bodyOf(calls[0]), { user_id: "456" });
});

Deno.test("call-transfer: dispatching strategy is dropped for an external number", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await callTransfer.execute(
    { callId: "812", number: "+18001231234", dispatchingStrategy: "random" },
    ctx,
  );
  assertEquals(bodyOf(calls[0]), { number: "+18001231234" });
});
