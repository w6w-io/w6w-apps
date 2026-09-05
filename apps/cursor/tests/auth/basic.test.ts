import type { SignableRequest } from "@w6w/types";
import { assertEquals } from "@std/assert";
import basicAuth, { authHeader } from "../../auth/basic.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("authHeader: base64-encodes the key with an empty password", () => {
  assertEquals(authHeader("crsr_abc123"), `Basic ${btoa("crsr_abc123:")}`);
});

Deno.test("sign: stamps the Authorization header and does not mutate anything else", async () => {
  const request: SignableRequest = {
    url: "https://api.cursor.com/teams/members",
    method: "GET",
    headers: {},
  };
  const out = await basicAuth.sign!(
    { request, credential: { apiKey: "crsr_secret" } },
    mockCtx().ctx,
  );
  assertEquals(out.headers["authorization"], authHeader("crsr_secret"));
});

Deno.test("test: ok on 200", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { teamMembers: [] } }]);
  const result = await basicAuth.test({ credential: { apiKey: "crsr_good" } }, ctx);
  assertEquals(result.ok, true);
  assertEquals(pathOf(calls[0].url), "/teams/members");
  assertEquals(calls[0].headers["authorization"], authHeader("crsr_good"));
});

Deno.test("test: fails without throwing when apiKey is missing", async () => {
  const result = await basicAuth.test({ credential: {} }, mockCtx().ctx);
  assertEquals(result.ok, false);
});

Deno.test("test: classifies 401 using the response body's own message", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: { error: "Unauthorized", message: "Invalid API key" } },
  ]);
  const result = await basicAuth.test({ credential: { apiKey: "crsr_bad" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(result.message, "Invalid API key");
});

Deno.test("test: classifies 403 as a scope/plan problem, not a bad key", async () => {
  const { ctx } = mockCtx([
    { status: 403, body: { error: "Forbidden", message: "Enterprise access required" } },
  ]);
  const result = await basicAuth.test({ credential: { apiKey: "crsr_scoped" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(result.message?.includes("admin:*"), true);
});

Deno.test("afterConnect: publishes only the member count, never a name or email", async () => {
  const { ctx } = mockCtx([
    {
      body: {
        teamMembers: [
          {
            id: "user_1",
            name: "Alex",
            email: "alex@company.com",
            role: "member",
            isRemoved: false,
          },
          { id: "user_2", name: "Sam", email: "sam@company.com", role: "owner", isRemoved: false },
        ],
      },
    },
  ]);
  const out = await basicAuth.afterConnect!({ credential: { apiKey: "crsr_good" } }, ctx);
  assertEquals(out, { memberCount: 2 });
});

Deno.test("afterConnect: silent on failure — never fails a good Connection", async () => {
  const { ctx } = mockCtx([{ status: 500, body: { error: "Internal Server Error" } }]);
  const out = await basicAuth.afterConnect!({ credential: { apiKey: "crsr_good" } }, ctx);
  assertEquals(out, {});
});
