import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

Deno.test("api-key: collects the org subdomain alongside the credential", () => {
  assertEquals(auth.key, "api-key");
  assertEquals(auth.type, "apiKey");
  const keys = auth.fields?.map((f) => f.key);
  // The org subdomain identifies the ACCOUNT, so it belongs to the Connection
  // rather than being re-entered on every action.
  assertEquals(keys, ["orgSubdomain", "apiKey"]);
  assertEquals(auth.fields?.find((f) => f.key === "apiKey")?.type, "secret");
  assertEquals(auth.fields?.find((f) => f.key === "orgSubdomain")?.type, "string");
  assertEquals(auth.apiKey, { in: "header", name: "Authorization", prefix: "Bearer " });
});

Deno.test("api-key: sign uses Kustomer's Bearer scheme", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://acme.api.kustomerapp.com/v1/customers",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiKey: "tok" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer tok");
});

Deno.test("api-key: test refuses a half-filled credential without a request", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals(await auth.test({ credential: { orgSubdomain: "acme" } }, ctx), {
    ok: false,
    message: "credential missing orgSubdomain or apiKey",
  });
  assertEquals(calls.length, 0);
});

Deno.test("api-key: test probes the org's own host, signed itself", async () => {
  const ok = mockCtx([{ body: { data: { id: "1", type: "user" } } }]);
  assertEquals(
    await auth.test({ credential: { orgSubdomain: "acme", apiKey: "tok" } }, ok.ctx),
    { ok: true },
  );
  assertEquals(ok.calls[0].url, "https://acme.api.kustomerapp.com/v1/users/current");
  assertEquals(ok.calls[0].headers["authorization"], "Bearer tok");
});

Deno.test("api-key: test surfaces a non-2xx status", async () => {
  const { ctx } = mockCtx([{ status: 401, body: {} }]);
  assertEquals(
    await auth.test({ credential: { orgSubdomain: "acme", apiKey: "bad" } }, ctx),
    { ok: false, message: "Kustomer returned 401" },
  );
});

Deno.test("api-key: afterConnect records the org subdomain and the agent for the client to use", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "1", attributes: { name: "Jo" } } } }]);
  const out = await auth.afterConnect!(
    { credential: { orgSubdomain: "acme", apiKey: "tok" } },
    ctx,
  );
  assertEquals(out, { orgSubdomain: "acme", agent: { name: "Jo" } });
  // afterConnect gets an unsigned ctx.fetch (see hook-runtime.md) — it must
  // sign itself exactly like `test` does.
  assertEquals(calls[0].headers["authorization"], "Bearer tok");
});

Deno.test("api-key: afterConnect still records the org subdomain if the probe fails", async () => {
  const { ctx } = mockCtx([{ status: 500, body: {} }]);
  const out = await auth.afterConnect!(
    { credential: { orgSubdomain: "acme", apiKey: "tok" } },
    ctx,
  );
  // Without this the client could never build a URL for the connection.
  assertEquals(out, { orgSubdomain: "acme" });
});
