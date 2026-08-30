import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

Deno.test("api-key: collects the site name alongside the credential", () => {
  assertEquals(auth.key, "api-key");
  assertEquals(auth.type, "basic");
  const keys = auth.fields?.map((f) => f.key);
  // The site name identifies the ACCOUNT, so it belongs to the Connection
  // rather than being re-entered on every action.
  assertEquals(keys, ["domain", "apiKey"]);
  assertEquals(auth.fields?.find((f) => f.key === "apiKey")?.type, "secret");
  assertEquals(auth.fields?.find((f) => f.key === "domain")?.type, "string");
});

Deno.test("api-key: sign uses Teamwork's `apiKey:X` Basic scheme", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://acme.teamwork.com/projects/api/v3/tasks.json",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiKey: "tok" } }, ctx);
  assertEquals(out.headers["authorization"], `Basic ${btoa("tok:X")}`);
});

Deno.test("api-key: test refuses a half-filled credential without a request", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals(await auth.test({ credential: { domain: "acme" } }, ctx), {
    ok: false,
    message: "credential missing domain or apiKey",
  });
  assertEquals(calls.length, 0);
});

Deno.test("api-key: test probes the account's own host with a cheap, unscoped list call", async () => {
  const ok = mockCtx([{ body: { people: [{ id: 1 }] } }]);
  assertEquals(
    await auth.test({ credential: { domain: "acme", apiKey: "tok" } }, ok.ctx),
    { ok: true },
  );
  assertEquals(
    ok.calls[0].url,
    "https://acme.teamwork.com/projects/api/v3/people.json?pageSize=1",
  );
  assertEquals(ok.calls[0].headers["authorization"], `Basic ${btoa("tok:X")}`);
});

Deno.test("api-key: test surfaces Teamwork's own error detail on a 401", async () => {
  const bad = mockCtx([{
    status: 401,
    body: { errors: [{ title: "unexpected error", detail: "401: Not authorized" }] },
  }]);
  const out = await auth.test({ credential: { domain: "acme", apiKey: "wrong" } }, bad.ctx);
  assertEquals(out.ok, false);
  assertEquals(out.message?.includes("401: Not authorized"), true);
});

Deno.test("api-key: afterConnect records the site name and the caller's own person", async () => {
  const { ctx, calls } = mockCtx([
    { body: { people: [{ id: 7, firstName: "Jo", lastName: "Doe" }] } },
  ]);
  const out = await auth.afterConnect!({ credential: { domain: "acme", apiKey: "tok" } }, ctx);
  assertEquals(out, { domain: "acme", person: { id: 7, firstName: "Jo", lastName: "Doe" } });
  // afterConnect gets an unsigned ctx.fetch (see hook-runtime.md) — it must
  // sign itself exactly like `test` does.
  assertEquals(calls[0].headers["authorization"], `Basic ${btoa("tok:X")}`);
});

Deno.test("api-key: afterConnect still records the site name if the probe fails", async () => {
  const { ctx } = mockCtx([{ status: 500, body: {} }]);
  const out = await auth.afterConnect!({ credential: { domain: "acme", apiKey: "tok" } }, ctx);
  // Without this the client could never build a URL for the connection.
  assertEquals(out, { domain: "acme" });
});
