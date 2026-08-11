import { assert, assertEquals } from "@std/assert";
import auth from "../../auth/api-key.ts";
import { mockCtx } from "../_helpers.ts";

const req = () => ({ url: "https://api.emailoctopus.com/lists", method: "GET", headers: {} });

Deno.test("api-key: sign stamps a bearer token and touches nothing else", () => {
  const request = req();
  const out = auth.sign!({ request, credential: { apiKey: "eo_live_123" } }, mockCtx().ctx);
  assertEquals((out as typeof request).headers, { authorization: "Bearer eo_live_123" });
  assertEquals((out as typeof request).url, "https://api.emailoctopus.com/lists");
});

Deno.test("api-key: declares the header shape the v2 securityScheme documents", () => {
  assertEquals(auth.type, "apiKey");
  assertEquals(auth.apiKey, { in: "header", name: "Authorization", prefix: "Bearer " });
  const field = auth.fields![0];
  assertEquals(field.key, "apiKey");
  assertEquals(field.type, "secret");
  assertEquals(field.required, true);
});

Deno.test("api-key: test passes on the documented { data: [] } shape", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [{ id: "l1" }] } }]);
  const res = await auth.test!({ credential: { apiKey: "k" } }, ctx);
  assertEquals(res.ok, true);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/lists");
  assertEquals(url.searchParams.get("limit"), "1", "asks for one row, not the whole account");
});

Deno.test("api-key: test fails a 200 that is not the documented shape", async () => {
  // The trap this guards: an edge or a captive portal answering 200 with
  // something that is not the API. A status code is not a credential verdict.
  const { ctx } = mockCtx([{ body: { hello: "world" } }]);
  const res = await auth.test!({ credential: { apiKey: "k" } }, ctx);
  assertEquals(res.ok, false);
  assert(res.message!.includes("not the documented"));
});

Deno.test("api-key: test distinguishes the two 401 causes by BODY, not status", async () => {
  // Both are HTTP 401 against the live API (measured 2026-08-11); only the
  // body separates "no credential attached" from "bad key".
  const missing = mockCtx([{
    status: 401,
    body: {
      title: "An error occurred.",
      detail: "Full authentication is required to access this resource.",
      status: 401,
      type: "/errors/401",
    },
  }]);
  const invalid = mockCtx([{
    status: 401,
    body: {
      title: "An error occurred.",
      detail: "Invalid key.",
      status: 401,
      type: "https://emailoctopus.com/api-documentation/v2#unauthorized",
    },
  }]);

  const a = await auth.test!({ credential: { apiKey: "k" } }, missing.ctx);
  const b = await auth.test!({ credential: { apiKey: "k" } }, invalid.ctx);
  assertEquals(a.ok, false);
  assertEquals(b.ok, false);
  assertEquals(a.message, "Full authentication is required to access this resource.");
  assertEquals(b.message, "Invalid key.");
  assert(a.message !== b.message, "the two 401 causes must not collapse into one message");
});

Deno.test("api-key: test reports a 5xx as a vendor problem, not a bad credential", async () => {
  const { ctx } = mockCtx([{ status: 503, body: { detail: "Service unavailable." } }]);
  const res = await auth.test!({ credential: { apiKey: "k" } }, ctx);
  assertEquals(res.ok, false);
  assert(res.message!.includes("erroring (503)"), res.message);
});

Deno.test("api-key: test reports a non-JSON body as a request that never arrived", async () => {
  const { ctx } = mockCtx([{ status: 502, body: "<html>Bad gateway</html>" }]);
  const res = await auth.test!({ credential: { apiKey: "k" } }, ctx);
  assertEquals(res.ok, false);
  assert(res.message!.includes("non-JSON"), res.message);
});

Deno.test("api-key: test refuses a credential with no key without calling out", async () => {
  const { ctx, calls } = mockCtx([]);
  const res = await auth.test!({ credential: {} }, ctx);
  assertEquals(res.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: no test failure message echoes the credential", async () => {
  const secret = "eo_super_secret_value";
  const cases = [
    { status: 401, body: { title: "t", detail: "Invalid key.", type: "x" } },
    { status: 503, body: { detail: "nope" } },
    { status: 502, body: "<html/>" },
    { status: 200, body: { hello: "world" } },
  ];
  for (const c of cases) {
    const { ctx } = mockCtx([c]);
    const res = await auth.test!({ credential: { apiKey: secret } }, ctx);
    assert(!(res.message ?? "").includes(secret), `leaked the credential: ${res.message}`);
  }
});
