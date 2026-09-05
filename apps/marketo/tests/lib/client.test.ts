import { assert, assertEquals, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  compact,
  csv,
  errorMessage,
  MarketoClient,
  normalizeIdentityUrl,
  normalizeRestBaseUrl,
} from "../../lib/client.ts";

Deno.test("normalizeRestBaseUrl: adds https when a bare host is pasted", () => {
  assertEquals(
    normalizeRestBaseUrl("123-abc-456.mktorest.com"),
    "https://123-abc-456.mktorest.com",
  );
});

Deno.test("normalizeRestBaseUrl: strips a trailing /rest — base-url.md's own shape", () => {
  assertEquals(
    normalizeRestBaseUrl("https://123-abc-456.mktorest.com/rest"),
    "https://123-abc-456.mktorest.com",
  );
  assertEquals(
    normalizeRestBaseUrl("https://123-abc-456.mktorest.com/rest/"),
    "https://123-abc-456.mktorest.com",
  );
});

Deno.test("normalizeRestBaseUrl: leaves a bare endpoint (rest-api.md's own shape) unchanged", () => {
  assertEquals(
    normalizeRestBaseUrl("https://123-abc-456.mktorest.com"),
    "https://123-abc-456.mktorest.com",
  );
});

Deno.test("normalizeRestBaseUrl: throws on empty input", () => {
  assertThrows(() => normalizeRestBaseUrl(""));
});

Deno.test("normalizeIdentityUrl: strips a pasted /oauth/token suffix", () => {
  assertEquals(
    normalizeIdentityUrl("https://123-abc-456.mktorest.com/identity/oauth/token"),
    "https://123-abc-456.mktorest.com/identity",
  );
});

Deno.test("normalizeIdentityUrl: does not assume any relation to the REST base URL", () => {
  assertEquals(
    normalizeIdentityUrl("https://123-abc-456.mktorest.com/identity"),
    "https://123-abc-456.mktorest.com/identity",
  );
});

Deno.test("errorMessage: folds the errors array into one readable string", () => {
  assertEquals(
    errorMessage([{ code: "601", message: "Unauthorized" }]),
    "601: Unauthorized",
  );
  assertEquals(errorMessage([]), "");
  assertEquals(errorMessage(undefined), "");
});

Deno.test("compact: drops undefined, null, empty-string and empty-array values", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: [], f: "keep" }), {
    a: 1,
    f: "keep",
  });
});

Deno.test("csv: splits and trims a comma-separated string", () => {
  assertEquals(csv("a, b ,c"), ["a", "b", "c"]);
  assertEquals(csv(""), undefined);
  assertEquals(csv(undefined), undefined);
});

const conn = { display: { restBaseUrl: "https://123-abc-456.mktorest.com" } };

Deno.test("MarketoClient.request: routes to the Asset API path when asset:true", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, result: [] } }], conn);
  await new MarketoClient(ctx).request("/smartCampaigns.json", { asset: true });
  assertEquals(new URL(calls[0].url).pathname, "/rest/asset/v1/smartCampaigns.json");
});

Deno.test("MarketoClient.request: a 200 with success:false throws — status alone is not the signal", async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      body: { success: false, errors: [{ code: "606", message: "Max rate limit exceeded" }] },
    },
  ], conn);
  let threw = false;
  try {
    await new MarketoClient(ctx).request("/leads/describe.json");
  } catch (err) {
    threw = true;
    assert(String((err as Error).message).includes("606"));
  }
  assertEquals(threw, true);
});

Deno.test("MarketoClient.request: a non-JSON body throws with the raw status", async () => {
  const { ctx } = mockCtx([
    { status: 414, body: "Request-URI Too Long", headers: { "content-type": "text/plain" } },
  ], conn);
  let threw = false;
  try {
    await new MarketoClient(ctx).request("/leads.json");
  } catch (err) {
    threw = true;
    assert(String((err as Error).message).includes("414"));
  }
  assertEquals(threw, true);
});

Deno.test("MarketoClient.request: never sets an Authorization header itself", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, result: [] } }], conn);
  await new MarketoClient(ctx).request("/leads/describe.json");
  assertEquals(calls[0].headers["authorization"], undefined);
});
