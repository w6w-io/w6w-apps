import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/integration-key.ts";

const cred = { integrationKey: "IK", trackEventSecretKey: "TK", region: "US" };
const sign = (url: string) =>
  auth.sign!({
    request: { url, method: "GET", headers: {} },
    credential: cred,
  } as never, mockCtx([]).ctx) as { headers: Record<string, string> };

Deno.test("integration-key: an API host gets the integration key", () => {
  const signed = sign("https://app.pendo.io/api/v1/page");
  assertEquals(signed.headers["x-pendo-integration-key"], "IK");
});

Deno.test("integration-key: a data host gets the track event secret, not the integration key", () => {
  const signed = sign("https://data.pendo.io/data/track");
  assertEquals(signed.headers["x-pendo-integration-key"], "TK");
});

Deno.test("integration-key: every regional data host gets the track secret", () => {
  for (
    const host of [
      "data.pendo.io",
      "data.eu.pendo.io",
      "us1.data.pendo.io",
      "data.jpn.pendo.io",
      "data.au.pendo.io",
    ]
  ) {
    const signed = sign(`https://${host}/data/track`);
    assertEquals(signed.headers["x-pendo-integration-key"], "TK", host);
  }
});

Deno.test("integration-key: a data host falls back to the integration key when no track secret is set", () => {
  const signed = auth.sign!({
    request: { url: "https://data.pendo.io/data/track", method: "GET", headers: {} },
    credential: { integrationKey: "IK", region: "US" },
  } as never, mockCtx([]).ctx) as { headers: Record<string, string> };
  assertEquals(signed.headers["x-pendo-integration-key"], "IK");
});

Deno.test("test: a valid key reads `valid`/`writeAccess` from the body, not just the status", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { valid: true, writeAccess: true } }]);
  const result = await auth.test({ credential: cred }, ctx);
  assertEquals(calls[0].url, "https://app.pendo.io/api/v1/token/verify");
  assertEquals(calls[0].headers["x-pendo-integration-key"], "IK");
  assertEquals(result.ok, true);
  assert(/read-write/.test(result.message!), result.message);
});

Deno.test("test: a 200 with valid:false is not trusted just because the status is 200", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { valid: false } }]);
  const result = await auth.test({ credential: cred }, ctx);
  assertEquals(result.ok, false);
  assert(/not valid/.test(result.message!), result.message);
});

/** Verified live: Pendo answers a bad key with 403 and an EMPTY body. */
Deno.test("test: a 403 with no body is reported as a failure and suggests checking the region", async () => {
  const { ctx } = mockCtx([{ status: 403, body: "" }]);
  const result = await auth.test({ credential: cred }, ctx);
  assertEquals(result.ok, false);
  assert(/region/.test(result.message!), result.message);
});

Deno.test("test: a missing integration key is refused before any request is made", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await auth.test({ credential: { region: "US" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("test: reads the region's own api host", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { valid: true, writeAccess: false } }]);
  await auth.test({ credential: { integrationKey: "IK", region: "EU" } }, ctx);
  assertEquals(calls[0].url, "https://app.eu.pendo.io/api/v1/token/verify");
});

Deno.test("test: never echoes the credential in its message", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { valid: true, writeAccess: true } }]);
  const result = await auth.test({ credential: cred }, ctx);
  assert(!result.message!.includes("IK"), result.message);
});

Deno.test("afterConnect: normalizes the region", () => {
  const display = auth.afterConnect!({ credential: { region: "eu" } } as never, mockCtx([]).ctx);
  assertEquals(display, { region: "EU" });
});
