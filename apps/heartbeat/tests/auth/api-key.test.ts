import { assert, assertEquals } from "@std/assert";
import type { SignableRequest } from "@w6w/types";
import apiKey, { authHeaders, PROBE_PATH } from "../../auth/api-key.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("api-key: sign injects a bearer header and nothing else", async () => {
  const request: SignableRequest = {
    url: "https://api.heartbeat.chat/v0/roles",
    method: "GET",
    headers: {},
  };
  const out = await apiKey.sign!({ request, credential: { apiKey: "hb_live_abc" } }, mockCtx().ctx);
  assertEquals(out.headers.authorization, "Bearer hb_live_abc");
});

Deno.test("authHeaders: builds the exact wire format", () => {
  assertEquals(authHeaders({ apiKey: "xyz" }), { authorization: "Bearer xyz" });
});

Deno.test("api-key: test probes GET /v0/roles and succeeds on 200", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "r1", name: "Moderator" }] }]);
  const out = await apiKey.test({ credential: { apiKey: "good-key" } }, ctx);
  assertEquals(out, { ok: true });
  assertEquals(pathOf(calls[0].url), `/v0${PROBE_PATH}`);
  assertEquals(calls[0].headers.authorization, "Bearer good-key");
});

Deno.test("api-key: test reports the vendor's own message on a rejected key", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("Invalid API Key") }]);
  const out = await apiKey.test({ credential: { apiKey: "bad-key" } }, ctx);
  assertEquals(out.ok, false);
  assert(out.message, "test() reported no message for a rejected key");
  // Never echoes the credential back in the message.
  assert(!out.message.includes("bad-key"), "test() echoed the credential");
  assert(out.message.includes("Invalid API Key"), "vendor message was dropped");
});

Deno.test("api-key: test fails locally without ever calling fetch when apiKey is blank", async () => {
  const { ctx, calls } = mockCtx([]);
  const out = await apiKey.test({ credential: { apiKey: "" } }, ctx);
  assertEquals(out.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: credential field is declared secret", () => {
  for (const f of apiKey.fields ?? []) {
    assertEquals(f.type, "secret", `${f.key}: credential field is not type "secret"`);
  }
});
