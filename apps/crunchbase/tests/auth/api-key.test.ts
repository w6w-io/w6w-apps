import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

Deno.test("api-key: is an apiKey auth stamping the X-cb-user-key header", async () => {
  assertEquals(auth.type, "apiKey");
  assertEquals(auth.apiKey, { in: "header", name: "X-cb-user-key" });
  const request = {
    url: "https://api.crunchbase.com/v4/data/autocompletes",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiKey: "secret-key" } }, {} as never);
  assertEquals(out.headers["x-cb-user-key"], "secret-key");
});

Deno.test("api-key: the field is a secret", () => {
  const field = auth.fields!.find((f) => f.key === "apiKey")!;
  assertEquals(field.type, "secret");
  assertEquals(field.required, true);
});

Deno.test("api-key: test probes autocomplete, the endpoint every package includes", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { entities: [] } }]);
  const result = await auth.test({ credential: { apiKey: "sk" } }, ctx);
  assertEquals(result, { ok: true });
  assertEquals(
    calls[0].url,
    "https://api.crunchbase.com/v4/data/autocompletes?query=crunchbase&limit=1",
  );
  assertEquals(calls[0].headers["x-cb-user-key"], "sk");
});

Deno.test("api-key: a 401 reports the vendor's own error code, not the key", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    headers: { "content-type": "text/plain" },
    body: [{ status: 401, code: "LA401", message: "Unauthorized user_key" }],
  }]);
  const result = await auth.test({ credential: { apiKey: "bad-key-should-not-appear" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(result.message, "Crunchbase rejected the credential (Unauthorized user_key LA401)");
});

Deno.test("api-key: a 403 is reported as an access problem, distinct from a bad key", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: [{ status: 403, code: "LA403", message: "Insufficient package access" }],
  }]);
  const result = await auth.test({ credential: { apiKey: "sk" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(
    result.message,
    "Crunchbase denied access to this endpoint (Insufficient package access LA403)",
  );
});

Deno.test("api-key: a missing credential fails before any network call", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals(await auth.test({ credential: {} }, ctx), {
    ok: false,
    message: "credential missing apiKey",
  });
  assertEquals(calls.length, 0);
});

Deno.test("api-key: the error body's key is never echoed back", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: [{ status: 401, code: "LA401", message: "Unauthorized user_key" }],
  }]);
  const result = await auth.test({ credential: { apiKey: "totally-secret-value" } }, ctx);
  const dump = JSON.stringify(result);
  if (dump.includes("totally-secret-value")) {
    throw new Error("the credential leaked into the test result");
  }
});
