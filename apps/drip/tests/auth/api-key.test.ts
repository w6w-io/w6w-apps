import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

Deno.test("api-key: collects the account id alongside the credential", () => {
  assertEquals(auth.key, "api-key");
  assertEquals(auth.type, "basic");
  const keys = auth.fields?.map((f) => f.key);
  assertEquals(keys, ["accountId", "apiKey"]);
  assertEquals(auth.fields?.find((f) => f.key === "apiKey")?.type, "secret");
  assertEquals(auth.fields?.find((f) => f.key === "accountId")?.type, "string");
});

Deno.test("api-key: sign uses Drip's `token:` Basic scheme (empty password)", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.getdrip.com/v2/1234567/subscribers",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiKey: "tok" } }, ctx);
  assertEquals(out.headers["authorization"], `Basic ${btoa("tok:")}`);
});

Deno.test("api-key: test refuses a half-filled credential without a request", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals(await auth.test({ credential: { accountId: "1234567" } }, ctx), {
    ok: false,
    message: "credential missing accountId or apiKey",
  });
  assertEquals(calls.length, 0);
});

Deno.test("api-key: test probes GET /v2/user, signed itself", async () => {
  const ok = mockCtx([{ body: { users: [{ email: "john@acme.com" }] } }]);
  assertEquals(
    await auth.test({ credential: { accountId: "1234567", apiKey: "tok" } }, ok.ctx),
    { ok: true },
  );
  assertEquals(ok.calls[0].url, "https://api.getdrip.com/v2/user");
  assertEquals(ok.calls[0].headers["authorization"], `Basic ${btoa("tok:")}`);
});

Deno.test("api-key: test classifies by the response body, not just the status", async () => {
  // A 200 with a body that isn't shaped like Drip's `users` envelope (e.g. an
  // auth-proxy's generic success page) must not be read as a live credential.
  const { ctx } = mockCtx([{ status: 200, body: { ok: true } }]);
  assertEquals(
    await auth.test({ credential: { accountId: "1234567", apiKey: "tok" } }, ctx),
    { ok: false, message: "Drip response did not include a `users` array" },
  );
});

Deno.test("api-key: test fails on a non-2xx status", async () => {
  const { ctx } = mockCtx([{ status: 401, body: {} }]);
  assertEquals(
    await auth.test({ credential: { accountId: "1234567", apiKey: "bad" } }, ctx),
    { ok: false, message: "Drip returned 401" },
  );
});

Deno.test("api-key: afterConnect records the account id and the user for the client to use", async () => {
  const { ctx, calls } = mockCtx([{ body: { users: [{ email: "john@acme.com", name: "John" }] } }]);
  const out = await auth.afterConnect!(
    { credential: { accountId: "1234567", apiKey: "tok" } },
    ctx,
  );
  assertEquals(out, { accountId: "1234567", user: { email: "john@acme.com", name: "John" } });
  // afterConnect gets an unsigned ctx.fetch — it must sign itself exactly
  // like `test` does.
  assertEquals(calls[0].headers["authorization"], `Basic ${btoa("tok:")}`);
});

Deno.test("api-key: afterConnect still records the account id if the probe fails", async () => {
  const { ctx } = mockCtx([{ status: 500, body: {} }]);
  const out = await auth.afterConnect!(
    { credential: { accountId: "1234567", apiKey: "tok" } },
    ctx,
  );
  // Without this the client could never build a URL for the connection.
  assertEquals(out, { accountId: "1234567" });
});
