import { assertEquals } from "@std/assert";
import auth from "../../auth/api-key.ts";
import { mockCtx } from "../_helpers.ts";
import { NETWORK_PLACEHOLDER } from "../../lib/client.ts";

Deno.test("sign(): sets X-Api-Key and fills in the network placeholder", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: `https://api.folk.app/network/${NETWORK_PLACEHOLDER}/groups`,
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!(
    { request, credential: { apiKey: "key_123", networkId: "net_1" } },
    ctx,
  );
  assertEquals(out.headers["x-api-key"], "key_123");
  assertEquals(out.url, "https://api.folk.app/network/net_1/groups");
});

Deno.test("sign(): URL-encodes the network id", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: `https://api.folk.app/network/${NETWORK_PLACEHOLDER}/groups`,
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!(
    { request, credential: { apiKey: "key_123", networkId: "net/1" } },
    ctx,
  );
  assertEquals(out.url, "https://api.folk.app/network/net%2F1/groups");
});

Deno.test("sign(): a URL with no placeholder is left untouched (e.g. /user)", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.folk.app/user",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!(
    { request, credential: { apiKey: "key_123", networkId: "net_1" } },
    ctx,
  );
  assertEquals(out.url, "https://api.folk.app/user");
  assertEquals(out.headers["x-api-key"], "key_123");
});

Deno.test("test(): missing apiKey fails without calling the network", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: { networkId: "net_1" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("test(): missing networkId fails without calling the network", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: { apiKey: "key_123" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("test(): a live key+network calling check-access passes", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { ok: true } }]);
  const result = await auth.test({ credential: { apiKey: "key_123", networkId: "net_1" } }, ctx);
  assertEquals(result.ok, true);
  assertEquals(calls[0].url, "https://api.folk.app/network/net_1/check-access");
  assertEquals(calls[0].headers["x-api-key"], "key_123");
});

Deno.test("test(): check-access answering ok:false fails", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { ok: false } }]);
  const result = await auth.test({ credential: { apiKey: "key_123", networkId: "net_1" } }, ctx);
  assertEquals(result.ok, false);
});

Deno.test("test(): 401 fails, never echoing the key", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { message: "Unauthorized." } }]);
  const result = await auth.test({ credential: { apiKey: "key_123", networkId: "net_1" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(result.message?.includes("key_123"), false);
});

Deno.test("test(): 404 reports the network id may be wrong", async () => {
  const { ctx } = mockCtx([{ status: 404, body: "" }]);
  const result = await auth.test({ credential: { apiKey: "key_123", networkId: "net_1" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(result.message?.includes("net_1"), true);
});

Deno.test("afterConnect: records name/email, never the key", async () => {
  const { ctx } = mockCtx([{
    status: 201,
    body: { id: "u1", name: "Ada Lovelace", email: "ada@example.com" },
  }]);
  const display = await auth.afterConnect!({ credential: { apiKey: "key_123" } }, ctx);
  assertEquals(display, { name: "Ada Lovelace", email: "ada@example.com" });
  assertEquals(JSON.stringify(display).includes("key_123"), false);
});

Deno.test("afterConnect: a failed lookup returns an empty display rather than throwing", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  const display = await auth.afterConnect!({ credential: { apiKey: "key_123" } }, ctx);
  assertEquals(display, {});
});
