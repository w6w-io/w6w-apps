import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

Deno.test("api-key: declares hapikey as an apiKey-in-query field", () => {
  assertEquals(auth.key, "api-key");
  assertEquals(auth.type, "apiKey");
  assertEquals(auth.apiKey?.in, "query");
  assertEquals(auth.apiKey?.name, "hapikey");
  assert(auth.description?.toLowerCase().includes("retired") ?? false, "description should call out deprecation");
});

Deno.test("api-key: sign appends hapikey to the URL", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.hubapi.com/crm/v3/objects/contacts",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiKey: "legacy-key" } }, ctx);
  const url = new URL(out.url);
  assertEquals(url.searchParams.get("hapikey"), "legacy-key");
});

Deno.test("api-key: test probes /crm/v3/objects/contacts with the hapikey query param", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { results: [] } }]);
  const result = await auth.test({ credential: { apiKey: "legacy-key" } }, ctx);
  assertEquals(result.ok, true);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("hapikey"), "legacy-key");
  assertEquals(url.searchParams.get("limit"), "1");
});
