import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/basic.ts";

Deno.test("basic: is a basic method exposing accountId and apiKey fields", () => {
  assertEquals(auth.key, "basic");
  assertEquals(auth.type, "basic");
  const accountId = auth.fields?.find((f) => f.key === "accountId");
  const apiKey = auth.fields?.find((f) => f.key === "apiKey");
  assert(accountId, "must declare an `accountId` field");
  assert(apiKey, "must declare an `apiKey` field");
  assertEquals(accountId.required, true);
  assertEquals(apiKey.type, "secret");
  assertEquals(apiKey.required, true);
});

Deno.test("basic: sign sets Basic base64(accountId:apiKey)", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://x",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!(
    { request, credential: { accountId: "acc-1", apiKey: "ak_abc123" } },
    ctx,
  );
  assertEquals(out.headers["authorization"], `Basic ${btoa("acc-1:ak_abc123")}`);
});

Deno.test("basic: test hits GET /{accountId}?fields=id,email and reports ok", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "acc-1", email: "a@acme.com" } }]);
  const result = await auth.test({ credential: { accountId: "acc-1", apiKey: "ak_abc123" } }, ctx);
  assertEquals(result.ok, true);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.youcanbook.me");
  assertEquals(url.pathname, "/v1/acc-1");
  assertEquals(url.searchParams.get("fields"), "id,email");
  assertEquals(calls[0].headers["authorization"], `Basic ${btoa("acc-1:ak_abc123")}`);
});

Deno.test("basic: test reports failure when credential missing", async () => {
  const { ctx } = mockCtx();
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("missing"));
});

Deno.test("basic: test reports failure with vendor message when API rejects", async () => {
  const { ctx } = mockCtx([
    {
      status: 401,
      body: {
        code: "caligraph_not_using_basic_authentication",
        message: "Please use Basic authentication",
      },
    },
  ]);
  const result = await auth.test({ credential: { accountId: "acc-1", apiKey: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(result.message, "Please use Basic authentication");
});

Deno.test("basic: test reports failure on an unexpected (id-less) response shape", async () => {
  const { ctx } = mockCtx([{ status: 200, body: {} }]);
  const result = await auth.test({ credential: { accountId: "acc-1", apiKey: "ak_abc123" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("unexpected"));
});

Deno.test("basic: afterConnect fetches the account and returns nested email label data", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "acc-1", email: "a@acme.com" } }]);
  const result = await auth.afterConnect!({ credential: { accountId: "acc-1" } }, ctx);
  assertEquals(result, { account: { email: "a@acme.com" } });
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/acc-1");
});

Deno.test("basic: afterConnect returns nothing without an accountId", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.afterConnect!({ credential: {} }, ctx);
  assertEquals(result, {});
  assertEquals(calls.length, 0);
});
