import { assertEquals } from "@std/assert";
import webhookCreate from "../../actions/webhook-create.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

const CREATED = envelope({
  id: 4354367,
  url: "https://example.com/hook",
  events: ["job.finished", "job.failed"],
  signing_secret: "XXXXXXXXXXXXXXX",
});

Deno.test("webhook-create: POSTs url and events, normalising events to an array", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: CREATED }]);
  const out = await webhookCreate.execute(
    { url: "https://example.com/hook", events: "job.finished, job.failed" },
    ctx,
  ) as { signing_secret: string };

  assertEquals(pathOf(calls[0].url), "/v2/webhooks");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { url: "https://example.com/hook", events: ["job.finished", "job.failed"] });
  assertEquals(out.signing_secret, "XXXXXXXXXXXXXXX");
});

Deno.test("webhook-create: accepts events already as an array", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: CREATED }]);
  await webhookCreate.execute({ url: "https://example.com/hook", events: ["job.finished"] }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.events, ["job.finished"]);
});

Deno.test("webhook-create: is declared non-idempotent — CloudConvert documents no idempotency key", () => {
  assertEquals(webhookCreate.idempotent, false);
});
