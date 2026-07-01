import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";
import { NOTION_VERSION } from "../../lib/client.ts";

Deno.test("oauth2: declares Notion authorize/token endpoints and no PKCE", () => {
  assertEquals(auth.key, "oauth2");
  assertEquals(auth.type, "oauth2");
  assertEquals(auth.oauth2?.authorizationUrl, "https://api.notion.com/v1/oauth/authorize");
  assertEquals(auth.oauth2?.tokenUrl, "https://api.notion.com/v1/oauth/token");
  assertEquals(auth.oauth2?.pkce, false);
});

Deno.test("oauth2: sign appends Bearer access token and Notion-Version", async () => {
  const { ctx } = mockCtx();
  const request = { url: "https://x", method: "GET" as const, headers: {} as Record<string, string> };
  const out = await auth.sign!({ request, credential: { accessToken: "acc-123" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer acc-123");
  assertEquals(out.headers["Notion-Version"], NOTION_VERSION);
});

Deno.test("oauth2: test with missing accessToken reports the failure without a network call", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("accessToken"));
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: test issues GET /users/me with Bearer token", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { object: "user" } }]);
  const result = await auth.test({ credential: { accessToken: "acc-abc" } }, ctx);
  assertEquals(result.ok, true);
  assertEquals(new URL(calls[0].url).pathname, "/v1/users/me");
  assertEquals(calls[0].headers["authorization"], "Bearer acc-abc");
});
