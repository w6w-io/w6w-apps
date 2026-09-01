import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/basic.ts";
import { TIER_HEADER_VALUE } from "../../lib/client.ts";

const CRED = { websiteId: "site_1", identifier: "tok-id", key: "tok-key" };
const EXPECTED_AUTH = `Basic ${btoa("tok-id:tok-key")}`;

Deno.test("auth: declares HTTP Basic with websiteId + both token halves", () => {
  assertEquals(auth.type, "basic");
  assertEquals(auth.fields?.map((f) => f.key), ["websiteId", "identifier", "key"]);
  assertEquals(auth.fields?.find((f) => f.key === "websiteId")?.type, "string");
  assertEquals(auth.fields?.find((f) => f.key === "identifier")?.type, "secret");
  assertEquals(auth.fields?.find((f) => f.key === "key")?.type, "secret");
});

Deno.test("auth: sign sets Basic authorization AND the required X-Crisp-Tier header", () => {
  const request = { headers: {} as Record<string, string> };
  const signed = auth.sign!({ request, credential: CRED } as never, {} as never) as typeof request;
  assertEquals(signed.headers["authorization"], EXPECTED_AUTH);
  assertEquals(atob(signed.headers["authorization"].slice(6)), "tok-id:tok-key");
  assertEquals(signed.headers["x-crisp-tier"], TIER_HEADER_VALUE);
});

Deno.test("auth: test probes GET /website/{website_id} and classifies from the envelope", async () => {
  const { ctx, calls } = mockCtx([
    { body: { error: false, reason: "resolved", data: { website_id: "site_1", name: "Acme" } } },
  ]);
  const result = await auth.test({ credential: CRED } as never, ctx);
  assertEquals(result, { ok: true });
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/website/site_1");
  assertEquals(calls[0].headers["authorization"], EXPECTED_AUTH);
  assertEquals(calls[0].headers["x-crisp-tier"], TIER_HEADER_VALUE);
});

Deno.test("auth: test never trusts a 200 status alone — an error:true envelope on HTTP 200 fails closed", async () => {
  const { ctx } = mockCtx([
    { status: 200, body: { error: true, reason: "not_allowed", data: {} } },
  ]);
  const result = await auth.test({ credential: CRED } as never, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("not_allowed"));
});

Deno.test("auth: test fails closed when any of the three credential fields is missing", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals(await auth.test({ credential: { identifier: "i", key: "k" } } as never, ctx), {
    ok: false,
    message: "credential missing websiteId, identifier or key",
  });
  assertEquals(calls.length, 0);
});

Deno.test("auth: test reports a 404 without echoing the credential", async () => {
  const { ctx } = mockCtx([
    { status: 404, body: { error: true, reason: "not_subscribed", data: {} } },
  ]);
  const result = await auth.test({ credential: CRED } as never, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("404"));
  assert(!result.message?.includes("tok-key"), "message leaked the token key");
  assert(!result.message?.includes("tok-id"), "message leaked the token identifier");
});

Deno.test("auth: afterConnect echoes websiteId and the workspace name, never the token", async () => {
  const { ctx } = mockCtx([
    { body: { error: false, reason: "resolved", data: { website_id: "site_1", name: "Acme" } } },
  ]);
  const display = await auth.afterConnect!({ credential: CRED } as never, ctx);
  assertEquals(display, { websiteId: "site_1", name: "Acme" });
  assert(!JSON.stringify(display).includes("tok-key"));
});

Deno.test("auth: afterConnect degrades to websiteId-only when the probe fails", async () => {
  const { ctx } = mockCtx([{ status: 401 }]);
  const display = await auth.afterConnect!({ credential: CRED } as never, ctx);
  assertEquals(display, { websiteId: "site_1" });
});
