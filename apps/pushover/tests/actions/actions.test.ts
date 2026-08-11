import { assertEquals, assertRejects } from "@std/assert";
import messageSend from "../../actions/message-send.ts";
import userValidate from "../../actions/user-validate.ts";
import soundsList from "../../actions/sounds-list.ts";
import limitsGet from "../../actions/limits-get.ts";
import { failure, mockPushoverCtx, ok } from "../_helpers.ts";

Deno.test("message-send: posts the message and drops what was left blank", async () => {
  const { ctx, calls } = mockPushoverCtx([{ body: ok() }]);
  await messageSend.execute({ message: "deploy finished", title: "" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/1/messages.json");
  assertEquals(calls[0].body, "message=deploy+finished");
});

Deno.test("message-send: maps every optional parameter onto Pushover's names", async () => {
  const { ctx, calls } = mockPushoverCtx([{ body: ok() }]);
  await messageSend.execute({
    message: "x",
    title: "T",
    device: "iphone",
    sound: "siren",
    url: "https://example.com",
    urlTitle: "Open",
    html: true,
    timestamp: 1700000000,
    ttl: 3600,
  }, ctx);
  const sent = new URLSearchParams(calls[0].body!);
  assertEquals(sent.get("title"), "T");
  assertEquals(sent.get("device"), "iphone");
  assertEquals(sent.get("sound"), "siren");
  assertEquals(sent.get("url"), "https://example.com");
  assertEquals(sent.get("url_title"), "Open");
  assertEquals(sent.get("html"), "1");
  assertEquals(sent.get("timestamp"), "1700000000");
  assertEquals(sent.get("ttl"), "3600");
});

/**
 * The recipient override rides as `user`, which `sign` then leaves alone —
 * that pairing is what makes a per-message recipient possible without the
 * action ever holding the Connection's key.
 */
Deno.test("message-send: a recipient override is sent as the user parameter", async () => {
  const { ctx, calls } = mockPushoverCtx([{ body: ok() }]);
  await messageSend.execute({ message: "x", userOverride: "OTHERKEY" }, ctx);
  assertEquals(new URLSearchParams(calls[0].body!).get("user"), "OTHERKEY");
});

/**
 * Emergency priority makes retry and expire REQUIRED. Catching it here names the
 * missing parameter instead of letting it arrive as a generic 4xx.
 */
Deno.test("message-send: emergency priority requires retry and expire", async () => {
  const { ctx, calls } = mockPushoverCtx([]);
  await assertRejects(
    async () => {
      await messageSend.execute({ message: "x", priority: "2" }, ctx);
    },
    Error,
    "Emergency priority requires both Retry and Expire",
  );
  await assertRejects(
    async () => {
      await messageSend.execute({ message: "x", priority: "2", retry: 60 }, ctx);
    },
    Error,
    "requires both Retry and Expire",
  );
  assertEquals(calls.length, 0, "nothing should have been sent");
});

Deno.test("message-send: emergency priority sends retry and expire when both are given", async () => {
  const { ctx, calls } = mockPushoverCtx([{ body: ok({ receipt: "rcpt123" }) }]);
  const out = await messageSend.execute(
    { message: "wake up", priority: "2", retry: 60, expire: 3600 },
    ctx,
  ) as { receipt?: string };
  const sent = new URLSearchParams(calls[0].body!);
  assertEquals(sent.get("priority"), "2");
  assertEquals(sent.get("retry"), "60");
  assertEquals(sent.get("expire"), "3600");
  assertEquals(out.receipt, "rcpt123");
});

/** Retry/expire on a non-emergency message are silently ignored by Pushover — say so instead. */
Deno.test("message-send: refuses retry or expire without emergency priority", async () => {
  const { ctx, calls } = mockPushoverCtx([]);
  await assertRejects(
    async () => {
      await messageSend.execute({ message: "x", priority: "0", retry: 60 }, ctx);
    },
    Error,
    "only apply to emergency priority",
  );
  assertEquals(calls.length, 0);
});

/** Two calls send two notifications; Pushover has no idempotency key. */
Deno.test("message-send: is honestly not idempotent", () => {
  assertEquals(messageSend.idempotent, false);
});

Deno.test("message-send: the documented length caps are declared on the params", () => {
  const byKey = Object.fromEntries((messageSend.params ?? []).map((p) => [p.key, p]));
  assertEquals(byKey.message.validation?.maxLength, 1024);
  assertEquals(byKey.title.validation?.maxLength, 250);
  assertEquals(byKey.url.validation?.maxLength, 512);
  assertEquals(byKey.urlTitle.validation?.maxLength, 100);
  // Pushover's floor for the emergency retry interval.
  assertEquals(byKey.retry.validation?.min, 30);
});

Deno.test("message-send: a rejection surfaces the vendor's own error text", async () => {
  const { ctx } = mockPushoverCtx([{
    status: 400,
    body: failure(["message cannot be blank", "user identifier is invalid"]),
  }]);
  await assertRejects(
    async () => {
      await messageSend.execute({ message: "x" }, ctx);
    },
    Error,
    "user identifier is invalid",
  );
});

Deno.test("user-validate: POSTs to users/validate and is a read, not a perform", async () => {
  const { ctx, calls } = mockPushoverCtx([{ body: ok({ devices: ["iphone"] }) }]);
  const out = await userValidate.execute({}, ctx) as { devices?: string[] };
  assertEquals(new URL(calls[0].url).pathname, "/1/users/validate.json");
  assertEquals(calls[0].method, "POST");
  assertEquals(userValidate.type, "read", "validation sends no notification");
  assertEquals(out.devices, ["iphone"]);
});

Deno.test("user-validate: checks a supplied key rather than the connection's", async () => {
  const { ctx, calls } = mockPushoverCtx([{ body: ok({ devices: [] }) }]);
  await userValidate.execute({ userOverride: "SOMEONEELSE", device: "nexus5" }, ctx);
  const sent = new URLSearchParams(calls[0].body!);
  assertEquals(sent.get("user"), "SOMEONEELSE");
  assertEquals(sent.get("device"), "nexus5");
});

/** Application-scoped endpoints: GET, no user key, and `sign` withholds it. */
Deno.test("sounds-list: GETs the application-scoped sounds endpoint", async () => {
  const { ctx, calls } = mockPushoverCtx([{ body: ok({ sounds: { bike: "Bike" } }) }]);
  const out = await soundsList.execute({}, ctx) as { sounds?: Record<string, string> };
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/1/sounds.json");
  assertEquals(out.sounds, { bike: "Bike" });
  assertEquals(soundsList.params?.length ?? 0, 0);
});

Deno.test("limits-get: GETs the allowance without spending any of it", async () => {
  const { ctx, calls } = mockPushoverCtx([{
    body: ok({ limit: 10000, remaining: 7496, reset: 1393653600 }),
  }]);
  const out = await limitsGet.execute({}, ctx) as { remaining?: number };
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/1/apps/limits.json");
  assertEquals(out.remaining, 7496);
  assertEquals(limitsGet.type, "read");
});
