import { assert, assertEquals } from "@std/assert";
import basic from "../../auth/basic.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("basic: sign stamps a Basic authorization header, base64(email:apiKey)", () => {
  const request = {
    url: "https://donorbox.org/api/v1/campaigns",
    headers: {} as Record<string, string>,
  };
  const out = basic.sign!(
    { request, credential: { email: "org@example.com", apiKey: "secret-key" } } as never,
    {} as never,
  ) as typeof request;
  assertEquals(out.headers["authorization"], `Basic ${btoa("org@example.com:secret-key")}`);
});

Deno.test("basic: sign never reveals the credential anywhere but the header it builds", () => {
  const request = {
    url: "https://donorbox.org/api/v1/campaigns",
    headers: {} as Record<string, string>,
  };
  const out = basic.sign!(
    { request, credential: { email: "org@example.com", apiKey: "top-secret" } } as never,
    {} as never,
  ) as typeof request;
  const keys = Object.keys(out.headers).filter((k) => k !== "authorization");
  for (const k of keys) assert(!out.headers[k].includes("top-secret"));
});

Deno.test("basic: test probes GET /api/v1/campaigns?per_page=1", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1 }] }]);
  const result = await basic.test(
    { credential: { email: "org@example.com", apiKey: "secret-key" } } as never,
    ctx,
  );
  assertEquals(result.ok, true);
  assertEquals(pathOf(calls[0].url), "/api/v1/campaigns");
  assertEquals(queryOf(calls[0].url).per_page, "1");
});

Deno.test("basic: test sends the credential via the Authorization header, not the URL or body", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await basic.test(
    { credential: { email: "org@example.com", apiKey: "secret-key" } } as never,
    ctx,
  );
  assertEquals(calls[0].headers["authorization"], `Basic ${btoa("org@example.com:secret-key")}`);
  assert(!calls[0].url.includes("secret-key"));
});

Deno.test("basic: test classifies a 401 from the flat {error} body, not the bare status", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("Authentication failed") }]);
  const result = await basic.test(
    { credential: { email: "org@example.com", apiKey: "wrong" } } as never,
    ctx,
  );
  assertEquals(result.ok, false);
  assert(result.message?.includes("Authentication failed"));
});

Deno.test("basic: test's failure message never echoes the credential back", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("Authentication failed") }]);
  const result = await basic.test(
    { credential: { email: "org@example.com", apiKey: "super-secret-key" } } as never,
    ctx,
  );
  assert(!result.message?.includes("super-secret-key"));
});

Deno.test("basic: test rejects a missing email or apiKey without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await basic.test({ credential: { email: "", apiKey: "x" } } as never, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("basic: the credential fields are declared secret/required as appropriate", () => {
  const email = basic.fields?.find((f) => f.key === "email");
  const apiKey = basic.fields?.find((f) => f.key === "apiKey");
  assertEquals(email?.type, "string");
  assertEquals(email?.required, true);
  assertEquals(apiKey?.type, "secret");
  assertEquals(apiKey?.required, true);
});
