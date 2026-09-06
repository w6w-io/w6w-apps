import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/webhook.ts";

Deno.test("webhook: sign splices user_id/webhook_code into the /rest/ path", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://myportal.bitrix24.com/rest/crm.lead.add",
    method: "POST",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!(
    { request, credential: { userId: "1", webhookCode: "abc123XYZ" } },
    ctx,
  );
  assertEquals(out.url, "https://myportal.bitrix24.com/rest/1/abc123XYZ/crm.lead.add");
});

Deno.test("webhook: sign never touches headers or body — the secret lives only in the URL", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://myportal.bitrix24.com/rest/crm.contact.get",
    method: "POST",
    headers: { "content-type": "application/json" } as Record<string, string>,
    body: '{"id":1}',
  };
  const out = await auth.sign!(
    { request, credential: { userId: "1", webhookCode: "secret" } },
    ctx,
  );
  assertEquals(out.headers, { "content-type": "application/json" });
  assertEquals(out.body, '{"id":1}');
  assert(!out.url.includes("undefined"));
});

Deno.test("webhook: portalUrl, userId and webhookCode are required; only webhookCode is secret", () => {
  const required = auth.fields!.filter((f) => f.required).map((f) => f.key).sort();
  assertEquals(required, ["portalUrl", "userId", "webhookCode"]);
  assertEquals(auth.fields!.filter((f) => f.type === "secret").map((f) => f.key), [
    "webhookCode",
  ]);
});

Deno.test("webhook: test succeeds on a 200 carrying {result}", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { result: { ID: "1", NAME: "Ada" }, time: {} } },
  ]);
  const out = await auth.test(
    {
      credential: { portalUrl: "myportal.bitrix24.com", userId: "1", webhookCode: "secretcode" },
    } as never,
    ctx,
  );
  assertEquals(out, { ok: true });
  assertEquals(
    calls[0].url,
    "https://myportal.bitrix24.com/rest/1/secretcode/profile",
  );
  assertEquals(calls[0].method, "POST");
});

Deno.test("webhook: test fails on an {error} body without ever surfacing the webhook code", async () => {
  const { ctx } = mockCtx([
    {
      status: 401,
      body: { error: "NO_AUTH_FOUND", error_description: "Wrong authorization data" },
    },
  ]);
  const out = await auth.test(
    {
      credential: {
        portalUrl: "https://myportal.bitrix24.com",
        userId: "1",
        webhookCode: "supersecret",
      },
    } as never,
    ctx,
  ) as { ok: boolean; message: string };
  assertEquals(out.ok, false);
  assert(out.message.includes("NO_AUTH_FOUND"), out.message);
  assert(
    !out.message.includes("supersecret"),
    `message must not echo the webhook code: ${out.message}`,
  );
});

Deno.test("webhook: test rejects a 200 with an unexpected body shape", async () => {
  const { ctx } = mockCtx([
    { status: 200, body: { unexpected: true } },
  ]);
  const out = await auth.test(
    { credential: { portalUrl: "https://x.com", userId: "1", webhookCode: "c" } } as never,
    ctx,
  ) as { ok: boolean };
  assertEquals(out.ok, false);
});

Deno.test("webhook: missing fields fail before any network call", async () => {
  const noUrl = mockCtx([]);
  assertEquals(
    await auth.test({ credential: { userId: "1", webhookCode: "c" } } as never, noUrl.ctx),
    { ok: false, message: "credential missing portalUrl" },
  );
  const noUserId = mockCtx([]);
  assertEquals(
    await auth.test(
      { credential: { portalUrl: "https://x.com", webhookCode: "c" } } as never,
      noUserId.ctx,
    ),
    { ok: false, message: "credential missing userId" },
  );
  const noCode = mockCtx([]);
  assertEquals(
    await auth.test(
      { credential: { portalUrl: "https://x.com", userId: "1" } } as never,
      noCode.ctx,
    ),
    { ok: false, message: "credential missing webhookCode" },
  );
  assertEquals(noUrl.calls.length + noUserId.calls.length + noCode.calls.length, 0);
});

Deno.test("webhook: afterConnect persists the normalised portalUrl, never userId/webhookCode", async () => {
  const display = await auth.afterConnect!(
    {
      credential: {
        portalUrl: "myportal.bitrix24.com/",
        userId: "1",
        webhookCode: "topsecret",
      },
    } as never,
    mockCtx().ctx,
  ) as Record<string, unknown>;
  assertEquals(display, { portalUrl: "https://myportal.bitrix24.com" });
  assert(!JSON.stringify(display).includes("topsecret"), "the webhook code leaked into display");
});
