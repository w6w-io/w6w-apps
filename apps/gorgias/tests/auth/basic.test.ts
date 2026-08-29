import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/basic.ts";

Deno.test("basic: collects the domain and email alongside the credential", () => {
  assertEquals(auth.key, "basic");
  assertEquals(auth.type, "basic");
  const keys = auth.fields?.map((f) => f.key);
  // The domain identifies the ACCOUNT, so it belongs to the Connection rather
  // than being re-entered on every action.
  assertEquals(keys, ["domain", "email", "apiKey"]);
  assertEquals(auth.fields?.find((f) => f.key === "apiKey")?.type, "secret");
  assertEquals(auth.fields?.find((f) => f.key === "domain")?.type, "string");
  assertEquals(auth.fields?.find((f) => f.key === "email")?.type, "string");
});

Deno.test("basic: sign uses Gorgias's email:apiKey Basic scheme", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://acme.gorgias.com/api/tickets",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!(
    { request, credential: { email: "jo@acme.test", apiKey: "tok" } },
    ctx,
  );
  assertEquals(out.headers["authorization"], `Basic ${btoa("jo@acme.test:tok")}`);
});

Deno.test("basic: test refuses a half-filled credential without a request", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals(
    await auth.test({ credential: { domain: "acme", email: "jo@acme.test" } }, ctx),
    { ok: false, message: "credential missing domain, email or apiKey" },
  );
  assertEquals(calls.length, 0);
});

Deno.test("basic: test probes the account's own host, signed itself", async () => {
  const ok = mockCtx([{ body: { domain: "acme", status: { status: "active" } } }]);
  assertEquals(
    await auth.test(
      { credential: { domain: "acme", email: "jo@acme.test", apiKey: "tok" } },
      ok.ctx,
    ),
    { ok: true },
  );
  assertEquals(ok.calls[0].url, "https://acme.gorgias.com/api/account");
  assertEquals(ok.calls[0].headers["authorization"], `Basic ${btoa("jo@acme.test:tok")}`);
});

Deno.test("basic: test reads Gorgias's own error message rather than guessing from the status code", async () => {
  const bad = mockCtx([{ status: 401, body: { error: { msg: "Unauthorized." } } }]);
  assertEquals(
    await auth.test(
      { credential: { domain: "acme", email: "jo@acme.test", apiKey: "wrong" } },
      bad.ctx,
    ),
    { ok: false, message: "Unauthorized." },
  );
});

Deno.test("basic: afterConnect records the domain and the account for the client to use", async () => {
  const { ctx, calls } = mockCtx([{ body: { domain: "acme", status: { status: "active" } } }]);
  const out = await auth.afterConnect!(
    { credential: { domain: "acme", email: "jo@acme.test", apiKey: "tok" } },
    ctx,
  );
  assertEquals(out, { domain: "acme", account: { domain: "acme", status: { status: "active" } } });
  // afterConnect gets an unsigned ctx.fetch (see hook-runtime.md) — it must
  // sign itself exactly like `test` does.
  assertEquals(calls[0].headers["authorization"], `Basic ${btoa("jo@acme.test:tok")}`);
});

Deno.test("basic: afterConnect still records the domain if the probe fails", async () => {
  const { ctx } = mockCtx([{ status: 500, body: {} }]);
  const out = await auth.afterConnect!(
    { credential: { domain: "acme", email: "jo@acme.test", apiKey: "tok" } },
    ctx,
  );
  // Without this the client could never build a URL for the connection.
  assertEquals(out, { domain: "acme" });
});
