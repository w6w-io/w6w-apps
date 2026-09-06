import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/access-token.ts";

Deno.test("access-token: collects the company slug alongside the credential", () => {
  assertEquals(auth.key, "access-token");
  assertEquals(auth.type, "bearer");
  const keys = auth.fields?.map((f) => f.key);
  // The company slug identifies the ACCOUNT/host, so it belongs to the
  // Connection rather than being re-entered on every action.
  assertEquals(keys, ["companySlug", "accessToken"]);
  assertEquals(auth.fields?.find((f) => f.key === "accessToken")?.type, "secret");
  assertEquals(auth.fields?.find((f) => f.key === "companySlug")?.type, "string");
});

Deno.test("access-token: sign uses a plain Bearer header", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://acme.booqable.com/api/4/customers",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "tok" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer tok");
});

Deno.test("access-token: test refuses a half-filled credential without a request", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals(
    await auth.test({ credential: { companySlug: "acme" } }, ctx),
    { ok: false, message: "credential missing companySlug or accessToken" },
  );
  assertEquals(calls.length, 0);
});

Deno.test("access-token: test probes companies/current, signed itself", async () => {
  const ok = mockCtx([{ body: { data: { attributes: { name: "Acme Rentals" } } } }]);
  assertEquals(
    await auth.test({ credential: { companySlug: "acme", accessToken: "tok" } }, ok.ctx),
    { ok: true },
  );
  assertEquals(ok.calls[0].url, "https://acme.booqable.com/api/4/companies/current");
  assertEquals(ok.calls[0].headers["authorization"], "Bearer tok");
});

Deno.test("access-token: test reads Booqable's own error message rather than guessing from the status code", async () => {
  const bad = mockCtx([{
    status: 401,
    body: { errors: [{ title: "Access denied", detail: "You need to be logged in." }] },
  }]);
  assertEquals(
    await auth.test({ credential: { companySlug: "acme", accessToken: "wrong" } }, bad.ctx),
    { ok: false, message: "Access denied: You need to be logged in." },
  );
});

Deno.test("access-token: afterConnect records the slug and the company for the client to use", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { attributes: { name: "Acme Rentals" } } } }]);
  const out = await auth.afterConnect!(
    { credential: { companySlug: "acme", accessToken: "tok" } },
    ctx,
  );
  assertEquals(out, { companySlug: "acme", company: { name: "Acme Rentals" } });
  assertEquals(calls[0].headers["authorization"], "Bearer tok");
});

Deno.test("access-token: afterConnect still records the slug if the probe fails", async () => {
  const { ctx } = mockCtx([{ status: 500, body: {} }]);
  const out = await auth.afterConnect!(
    { credential: { companySlug: "acme", accessToken: "tok" } },
    ctx,
  );
  // Without this the client could never build a URL for the connection.
  assertEquals(out, { companySlug: "acme" });
});
