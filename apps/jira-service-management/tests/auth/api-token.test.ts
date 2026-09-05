import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-token.ts";

Deno.test("api-token: sign injects a Basic authorization header", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://acme.atlassian.net/rest/servicedeskapi/servicedesk",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!(
    { request, credential: { email: "a@b.com", apiToken: "tok" } },
    ctx,
  );
  assertEquals(out.headers["authorization"], `Basic ${btoa("a@b.com:tok")}`);
});

Deno.test("api-token: test probes GET /servicedesk?limit=1 and reports ok on 200", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { values: [] } }]);
  const result = await auth.test(
    { credential: { site: "acme", email: "a@b.com", apiToken: "tok" } },
    ctx,
  );
  assertEquals(calls[0].url, "https://acme.atlassian.net/rest/servicedeskapi/servicedesk?limit=1");
  assertEquals(result, { ok: true });
});

Deno.test("api-token: test classifies a bad credential from the plain-text 401 body, not just the status", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    statusText: "Unauthorized",
    headers: { "content-type": "text/html;charset=UTF-8" },
    body: "Client must be authenticated to access this resource.",
  }]);
  const result = await auth.test(
    { credential: { site: "acme", email: "a@b.com", apiToken: "bad" } },
    ctx,
  );
  assertEquals(result.ok, false);
  assertEquals(result.message, "Client must be authenticated to access this resource.");
});

Deno.test("api-token: test rejects an incomplete credential without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await auth.test({ credential: { site: "acme" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-token: afterConnect records site and email without any network call", async () => {
  const { ctx, calls } = mockCtx([]);
  const display = await auth.afterConnect!(
    { credential: { site: "acme", email: "a@b.com", apiToken: "tok" } },
    ctx,
  );
  assertEquals(display, { site: "acme", email: "a@b.com" });
  assertEquals(calls.length, 0);
});
