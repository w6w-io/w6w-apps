import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-token.ts";

Deno.test("api-token: collects an instance URL and a secret token", () => {
  assertEquals(auth.key, "api-token");
  assertEquals(auth.type, "apiKey");
  const keys = auth.fields?.map((f) => f.key);
  assertEquals(keys, ["baseUrl", "apiToken"]);
  assertEquals(auth.fields?.find((f) => f.key === "apiToken")?.type, "secret");
  assertEquals(auth.fields?.find((f) => f.key === "baseUrl")?.default, "https://invoicing.co");
});

Deno.test("api-token: sign stamps X-API-TOKEN, nothing else", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://acme.invoicing.co/api/v1/clients",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiToken: "tok" } }, ctx);
  assertEquals(out.headers["x-api-token"], "tok");
});

Deno.test("api-token: test refuses a half-filled credential without a request", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals(
    await auth.test({ credential: { baseUrl: "https://acme.invoicing.co" } }, ctx),
    { ok: false, message: "credential missing baseUrl or apiToken" },
  );
  assertEquals(calls.length, 0);
});

Deno.test("api-token: test probes GET /api/v1/ping, signed itself", async () => {
  const ok = mockCtx([{ body: { company_name: "Acme Inc", user_name: "Jo" } }]);
  assertEquals(
    await auth.test(
      { credential: { baseUrl: "https://acme.invoicing.co", apiToken: "tok" } },
      ok.ctx,
    ),
    { ok: true },
  );
  assertEquals(ok.calls[0].url, "https://acme.invoicing.co/api/v1/ping");
  assertEquals(ok.calls[0].headers["x-api-token"], "tok");
  assertEquals(ok.calls[0].headers["x-requested-with"], "XMLHttpRequest");
});

Deno.test("api-token: test reads Invoice Ninja's own {message} body, not the bare status code", async () => {
  // Verified live: an invalid token comes back 403, not the OpenAPI doc's 401.
  const bad = mockCtx([{ status: 403, body: { message: "Invalid token" } }]);
  assertEquals(
    await auth.test(
      { credential: { baseUrl: "https://acme.invoicing.co", apiToken: "wrong" } },
      bad.ctx,
    ),
    { ok: false, message: "Invalid token" },
  );
});

Deno.test("api-token: afterConnect records the instance URL and company name", async () => {
  const { ctx, calls } = mockCtx([{ body: { company_name: "Acme Inc", user_name: "Jo" } }]);
  const out = await auth.afterConnect!(
    { credential: { baseUrl: "acme.invoicing.co", apiToken: "tok" } },
    ctx,
  );
  assertEquals(out, {
    baseUrl: "https://acme.invoicing.co",
    companyName: "Acme Inc",
    company: "Acme Inc",
    host: "acme.invoicing.co",
  });
  // afterConnect gets an unsigned ctx.fetch (see hook-runtime.md) — it must
  // sign itself exactly like `test` does.
  assertEquals(calls[0].headers["x-api-token"], "tok");
});

Deno.test("api-token: afterConnect still records the normalised URL if the probe fails", async () => {
  const { ctx } = mockCtx([{ status: 500, body: {} }]);
  const out = await auth.afterConnect!(
    { credential: { baseUrl: "acme.invoicing.co", apiToken: "tok" } },
    ctx,
  );
  // Without this the client could never build a URL for the connection.
  assertEquals(out, { baseUrl: "https://acme.invoicing.co" });
});
