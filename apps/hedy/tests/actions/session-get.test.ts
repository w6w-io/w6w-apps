import { assert, assertEquals } from "@std/assert";
import sessionGet from "../../actions/session-get.ts";
import { envelope, errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("session-get: calls GET /sessions/{id} and returns the detail payload", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: envelope({
        id: "sess_123456789",
        title: "Weekly Team Sync",
        startTime: "2024-03-15T14:30:00Z",
        endTime: "2024-03-15T15:15:00Z",
        duration: 45,
        transcript: "John: Let's review our progress...",
        conversations: "Q: What's the status of Project X?\nA: We're on track...",
        meeting_minutes: "1. Project Updates\n- Project X is on track...",
        recap: "Discussion about Q1 goals and project timeline",
      }),
    },
  ]);
  const out = await sessionGet.execute({ sessionId: "sess_123456789" }, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(pathOf(calls[0].url), "/sessions/sess_123456789");
  assertEquals(out.title, "Weekly Team Sync");
  assertEquals(out.transcript, "John: Let's review our progress...");
  assertEquals(out.meeting_minutes, "1. Project Updates\n- Project X is on track...");
});

Deno.test("session-get: a session id is path-escaped", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "a b/c" }) }]);
  await sessionGet.execute({ sessionId: "a b/c" }, ctx);
  assertEquals(pathOf(calls[0].url), "/sessions/a%20b%2Fc");
});

Deno.test("session-get: a 404 for an unknown session throws with the vendor's error code", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody("not_found", "Session not found") }]);
  try {
    await sessionGet.execute({ sessionId: "does-not-exist" }, ctx);
    throw new Error("expected execute to reject");
  } catch (err) {
    assert(String((err as Error).message).includes("not_found"));
  }
});

Deno.test("session-get: requires a sessionId param", () => {
  const param = sessionGet.params?.find((p) => p.key === "sessionId");
  assertEquals(param?.required, true);
});
