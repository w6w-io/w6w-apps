import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

Deno.test("api-key: sign merges api_key into the form body the action already built", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://example.com/sendy/api/brands/get-brands.php",
    method: "POST" as const,
    headers: {} as Record<string, string>,
    body: "brand_id=b1",
  };
  const out = await auth.sign!({ request, credential: { apiKey: "k1" } }, ctx);
  const body = new URLSearchParams(out.body ?? "");
  assertEquals(body.get("brand_id"), "b1");
  assertEquals(body.get("api_key"), "k1");
  assertEquals(out.headers["content-type"], "application/x-www-form-urlencoded");
});

Deno.test("api-key: sign works when the action sent no body of its own", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://example.com/sendy/unsubscribe",
    method: "POST" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiKey: "k1" } }, ctx);
  assertEquals(new URLSearchParams(out.body ?? "").get("api_key"), "k1");
});

Deno.test("api-key: the URL and key are both required fields", () => {
  const required = auth.fields!.filter((f) => f.required).map((f) => f.key).sort();
  assertEquals(required, ["apiKey", "baseUrl"]);
  assertEquals(auth.fields!.filter((f) => f.type === "secret").map((f) => f.key), ["apiKey"]);
});

Deno.test("api-key: test succeeds on the documented JSON brands response", async () => {
  const { ctx, calls } = mockCtx([{ body: JSON.stringify([{ id: "b1", name: "Acme" }]) }]);
  const result = await auth.test(
    { credential: { apiKey: "k1", baseUrl: "example.com/sendy" } },
    ctx,
  );
  assertEquals(result, { ok: true });
  assertEquals(calls[0].url, "https://example.com/sendy/api/brands/get-brands.php");
  const body = new URLSearchParams(calls[0].body ?? "");
  assertEquals(body.get("api_key"), "k1");
});

Deno.test("api-key: test succeeds on the documented 'No brands found' response", async () => {
  const { ctx } = mockCtx([{ body: "No brands found" }]);
  const result = await auth.test(
    { credential: { apiKey: "k1", baseUrl: "https://example.com/sendy" } },
    ctx,
  );
  assertEquals(result, { ok: true });
});

Deno.test("api-key: test fails on 'Invalid API key' without echoing the key", async () => {
  const { ctx } = mockCtx([{ body: "Invalid API key" }]);
  const result = await auth.test(
    { credential: { apiKey: "supersecret", baseUrl: "https://example.com/sendy" } },
    ctx,
  ) as { ok: boolean; message: string };
  assertEquals(result.ok, false);
  assert(!result.message.includes("supersecret"), "the credential leaked into the message");
});

Deno.test("api-key: test fails on an unrecognised body — not a Sendy install", async () => {
  const { ctx } = mockCtx([{ body: "<!doctype html><title>404</title>" }]);
  const result = await auth.test(
    { credential: { apiKey: "k1", baseUrl: "https://example.com/sendy" } },
    ctx,
  ) as { ok: boolean; message: string };
  assertEquals(result.ok, false);
  assert(result.message.includes("Sendy installation"), result.message);
});

Deno.test("api-key: a missing field fails before any network call", async () => {
  const noKey = mockCtx([]);
  assertEquals(
    await auth.test({ credential: { baseUrl: "https://x.com" } }, noKey.ctx),
    { ok: false, message: "credential missing apiKey" },
  );
  const noUrl = mockCtx([]);
  assertEquals(
    await auth.test({ credential: { apiKey: "k1" } }, noUrl.ctx),
    { ok: false, message: "credential missing baseUrl" },
  );
  assertEquals(noKey.calls.length + noUrl.calls.length, 0);
});

Deno.test("api-key: afterConnect normalises and stores the installation URL, never the key", async () => {
  const { ctx } = mockCtx();
  const display = await auth.afterConnect!(
    { credential: { apiKey: "supersecret", baseUrl: "example.com/sendy/" } },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(display, { baseUrl: "https://example.com/sendy" });
  assert(!JSON.stringify(display).includes("supersecret"), "the credential leaked into display");
});
