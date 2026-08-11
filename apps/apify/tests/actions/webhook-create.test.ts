import { assertEquals, assertRejects } from "@std/assert";
import webhookCreate from "../../actions/webhook-create.ts";
import { envelope, mockCtx, mockCtxWithInvocation, pathOf } from "../_helpers.ts";

const CREATED = envelope({ id: "w1", requestUrl: "https://hook.example/x" });

Deno.test("webhook-create: POSTs eventTypes and a single condition", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: CREATED }]);
  const out = await webhookCreate.execute(
    {
      requestUrl: "https://hook.example/x",
      eventTypes: ["ACTOR.RUN.SUCCEEDED", "ACTOR.RUN.FAILED"],
      actorId: "a1",
    },
    ctx,
  ) as { id: string };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/webhooks");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.requestUrl, "https://hook.example/x");
  assertEquals(body.eventTypes, ["ACTOR.RUN.SUCCEEDED", "ACTOR.RUN.FAILED"]);
  assertEquals(body.condition, { actorId: "a1" });
  assertEquals(out.id, "w1");
});

/**
 * The one endpoint in this app with a vendor-supported idempotency key. The
 * invocation id is stable across retries of a step, which is exactly what
 * "multiple calls with the same key return the existing webhook" needs — and a
 * duplicated webhook is not a harmless duplicate, it is every downstream
 * notification delivered twice, forever.
 */
Deno.test("webhook-create: sends the invocation id as the idempotency key", async () => {
  const { ctx, calls } = mockCtxWithInvocation([{ status: 201, body: CREATED }], "inv-abc");
  await webhookCreate.execute(
    { requestUrl: "https://hook.example/x", eventTypes: "TEST", taskId: "t1" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).idempotencyKey, "inv-abc");
});

Deno.test("webhook-create: is declared idempotent, which the key above earns", () => {
  assertEquals(webhookCreate.idempotent, true);
});

Deno.test("webhook-create: the task condition uses the API's actorTaskId spelling", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: CREATED }]);
  await webhookCreate.execute(
    { requestUrl: "https://hook.example/x", eventTypes: ["TEST"], taskId: "t1" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).condition, { actorTaskId: "t1" });
});

Deno.test("webhook-create: the run condition uses actorRunId", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: CREATED }]);
  await webhookCreate.execute(
    { requestUrl: "https://hook.example/x", eventTypes: ["TEST"], runId: "r1" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).condition, { actorRunId: "r1" });
});

Deno.test("webhook-create: no condition is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    // Async wrapper: `execute` validates synchronously and throws before
    // returning a promise, and an awaiting caller sees that as a rejection.
    async () =>
      await webhookCreate.execute(
        { requestUrl: "https://hook.example/x", eventTypes: ["TEST"] },
        ctx,
      ),
    Error,
    "Set exactly one",
  );
  assertEquals(calls.length, 0);
});

/**
 * Two conditions would create a webhook bound to whichever the API happens to
 * prefer — a silently wrong subscription rather than an error.
 */
Deno.test("webhook-create: two conditions are refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    // Async wrapper: `execute` validates synchronously and throws before
    // returning a promise, and an awaiting caller sees that as a rejection.
    async () =>
      await webhookCreate.execute(
        { requestUrl: "https://hook.example/x", eventTypes: ["TEST"], actorId: "a1", runId: "r1" },
        ctx,
      ),
    Error,
    "Set exactly one",
  );
  assertEquals(calls.length, 0);
});

Deno.test("webhook-create: an empty event-type list is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    // Async wrapper: `execute` validates synchronously and throws before
    // returning a promise, and an awaiting caller sees that as a rejection.
    async () =>
      await webhookCreate.execute(
        { requestUrl: "https://hook.example/x", eventTypes: [], actorId: "a1" },
        ctx,
      ),
    Error,
    "At least one event type",
  );
  assertEquals(calls.length, 0);
});

/**
 * Webhook event types underscore (`ACTOR.RUN.TIMED_OUT`) where run statuses
 * hyphenate (`TIMED-OUT`). Both spellings live in one API and mixing them is
 * silent.
 */
Deno.test("webhook-create: every offered event type uses the underscored spelling", () => {
  const options = webhookCreate.params?.find((p) => p.key === "eventTypes")?.options as
    | Array<{ value: string }>
    | undefined;
  assertEquals(options?.length, 12);
  for (const o of options ?? []) {
    assertEquals(o.value.includes("-"), false, `${o.value} uses a hyphen`);
    assertEquals(/^(ACTOR\.(RUN|BUILD)\.[A-Z_]+|TEST)$/.test(o.value), true, o.value);
  }
});
