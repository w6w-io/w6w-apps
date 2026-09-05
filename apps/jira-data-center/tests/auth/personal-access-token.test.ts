import { assert, assertEquals } from "@std/assert";
import personalAccessToken from "../../auth/personal-access-token.ts";
import { BASE_URL, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("personal-access-token: sign stamps a Bearer header, network-less", () => {
  const request = { headers: {} as Record<string, string>, url: "https://x", method: "GET" };
  const out = personalAccessToken.sign!(
    { request, credential: { baseUrl: BASE_URL, token: "secret-pat" } },
    // deno-lint-ignore no-explicit-any
    {} as any,
  ) as typeof request;
  assertEquals(out.headers["authorization"], "Bearer secret-pat");
});

Deno.test("personal-access-token: test() calls /myself with the bearer token and passes on a named user", async () => {
  const { ctx, calls } = mockCtx([{ body: { name: "jdoe", displayName: "Jane Doe" } }]);
  const result = await personalAccessToken.test(
    { credential: { baseUrl: BASE_URL, token: "secret-pat" } },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/rest/api/2/myself");
  assertEquals(calls[0].headers["authorization"], "Bearer secret-pat");
  assertEquals(result.ok, true);
});

Deno.test("personal-access-token: test() fails on a 401 without leaking the token in the message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errorMessages: ["Unauthorized"] } }]);
  const result = await personalAccessToken.test(
    { credential: { baseUrl: BASE_URL, token: "secret-pat" } },
    ctx,
  );
  assertEquals(result.ok, false);
  assert(!result.message?.includes("secret-pat"));
});

Deno.test("personal-access-token: afterConnect records the instance URL and user, never the token", async () => {
  const { ctx } = mockCtx([{ body: { name: "jdoe", key: "JIRAUSER1", displayName: "Jane Doe" } }]);
  const display = await personalAccessToken.afterConnect!(
    { credential: { baseUrl: BASE_URL, token: "secret-pat" } },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(display.baseUrl, BASE_URL);
  assertEquals((display.user as { name: string }).name, "jdoe");
  assert(!JSON.stringify(display).includes("secret-pat"));
});
