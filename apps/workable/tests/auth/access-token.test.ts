import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/access-token.ts";

Deno.test("access-token: collects the subdomain alongside the credential", () => {
  assertEquals(auth.key, "access-token");
  assertEquals(auth.type, "bearer");
  const keys = auth.fields?.map((f) => f.key);
  assertEquals(keys, ["subdomain", "accessToken"]);
  assertEquals(auth.fields?.find((f) => f.key === "accessToken")?.type, "secret");
});

Deno.test("access-token: sign stamps a plain Bearer header", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://acme.workable.com/spi/v3/jobs",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!(
    { request, credential: { subdomain: "acme", accessToken: "tok" } },
    ctx,
  );
  assertEquals(out.headers["authorization"], "Bearer tok");
});

Deno.test("access-token: test refuses a half-filled credential without a request", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals(await auth.test({ credential: { subdomain: "acme" } }, ctx), {
    ok: false,
    message: "credential missing subdomain or accessToken",
  });
  assertEquals(calls.length, 0);
});

Deno.test("access-token: test probes GET /accounts/:subdomain", async () => {
  const ok = mockCtx([{ body: { id: "1", name: "Acme" } }]);
  assertEquals(
    await auth.test({ credential: { subdomain: "acme", accessToken: "tok" } }, ok.ctx),
    { ok: true },
  );
  assertEquals(ok.calls[0].url, "https://acme.workable.com/spi/v3/accounts/acme");
  assertEquals(ok.calls[0].headers["authorization"], "Bearer tok");
});

Deno.test("access-token: test treats a 404 as a subdomain/token mismatch", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { error: "Not found" } }]);
  const out = await auth.test({ credential: { subdomain: "wrong", accessToken: "tok" } }, ctx);
  assert(!out.ok);
  assert(out.message!.includes("don't belong to the same account"));
});

Deno.test("access-token: afterConnect records the subdomain and account name", async () => {
  const { ctx } = mockCtx([{ body: { id: "1", name: "Acme" } }]);
  const out = await auth.afterConnect!(
    { credential: { subdomain: "acme", accessToken: "tok" } },
    ctx,
  );
  assertEquals(out, { subdomain: "acme", account: { name: "Acme", id: "1" } });
});

Deno.test("access-token: afterConnect still records the subdomain if the probe fails", async () => {
  const { ctx } = mockCtx([{ status: 500, body: {} }]);
  const out = await auth.afterConnect!(
    { credential: { subdomain: "acme", accessToken: "t" } },
    ctx,
  );
  assertEquals(out, { subdomain: "acme" });
});
