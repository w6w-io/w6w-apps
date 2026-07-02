import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

Deno.test("api-key: exposed as bearer with an `apiKey` secret field", () => {
  assertEquals(auth.key, "api-key");
  assertEquals(auth.type, "bearer");
  const field = auth.fields?.find((f) => f.key === "apiKey");
  assert(field, "must declare an `apiKey` field");
  assertEquals(field.type, "secret");
  assertEquals(field.required, true);
});

Deno.test("api-key: description flags Feb 2024 deprecation", () => {
  assert(
    (auth.description ?? "").toLowerCase().includes("deprecated") ||
      (auth.description ?? "").toLowerCase().includes("feb 2024"),
    "description should flag deprecation",
  );
});

Deno.test("api-key: sign appends Bearer using credential.apiKey", async () => {
  const { ctx } = mockCtx();
  const request = { url: "https://x", method: "GET" as const, headers: {} as Record<string, string> };
  const out = await auth.sign!({ request, credential: { apiKey: "keyLegacy" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer keyLegacy");
});

Deno.test("api-key: test surfaces the deprecation notice on failure", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "" }]);
  const result = await auth.test({ credential: { apiKey: "keyLegacy" } }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").toLowerCase().includes("personal access token"));
});

Deno.test("api-key: test with missing apiKey fails without a network call", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});
