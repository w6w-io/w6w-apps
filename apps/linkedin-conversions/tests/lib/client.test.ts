import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  API_VERSION,
  asJson,
  bareId,
  campaignConversionKey,
  compact,
  encodeUrn,
  formatLinkedInConversionsError,
  LinkedInConversionsClient,
  llaPartnerConversionUrn,
  restliList,
  sponsoredAccountUrn,
  sponsoredCampaignUrn,
} from "../../lib/client.ts";
import {
  createdResponse,
  errorBody,
  mockCtx,
  noContentResponse,
  pathOf,
  queryOf,
} from "../_helpers.ts";

// ---------------------------------------------------------------- URNs -----

Deno.test("sponsoredAccountUrn / sponsoredCampaignUrn: build from a bare id, pass a URN through", () => {
  assertEquals(sponsoredAccountUrn(123), "urn:li:sponsoredAccount:123");
  assertEquals(sponsoredAccountUrn("123"), "urn:li:sponsoredAccount:123");
  assertEquals(sponsoredAccountUrn("urn:li:sponsoredAccount:123"), "urn:li:sponsoredAccount:123");
  assertEquals(sponsoredCampaignUrn(1), "urn:li:sponsoredCampaign:1");
});

Deno.test("llaPartnerConversionUrn: uses the lla namespace, not li", () => {
  assertEquals(llaPartnerConversionUrn(123), "urn:lla:llaPartnerConversion:123");
  assertEquals(llaPartnerConversionUrn("123"), "urn:lla:llaPartnerConversion:123");
  assertEquals(
    llaPartnerConversionUrn("urn:lla:llaPartnerConversion:123"),
    "urn:lla:llaPartnerConversion:123",
  );
  // An li-namespace URN is passed through unchanged too — toUrn only prefixes
  // a bare id, it never rewrites an existing URN's namespace.
  assertEquals(llaPartnerConversionUrn("urn:li:sponsoredAccount:1"), "urn:li:sponsoredAccount:1");
});

Deno.test("bareId: strips any urn:*:*: prefix, passes a bare id through unchanged", () => {
  assertEquals(bareId("urn:lla:llaPartnerConversion:104012"), "104012");
  assertEquals(bareId(104012), "104012");
  assertEquals(bareId("urn:li:sponsoredAccount:512352200"), "512352200");
});

Deno.test("encodeUrn: percent-encodes the colons a URN needs inside a List(...)", () => {
  assertEquals(encodeUrn("urn:li:sponsoredAccount:123"), "urn%3Ali%3AsponsoredAccount%3A123");
});

Deno.test("restliList: List(...) with each member percent-encoded", () => {
  assertEquals(restliList(["OWNED", "SHARED"]), "List(OWNED,SHARED)");
});

Deno.test("campaignConversionKey: percent-encodes only the URN colons, keeps the compound key literal", () => {
  const key = campaignConversionKey(
    "urn:li:sponsoredCampaign:337643194",
    "urn:lla:llaPartnerConversion:70203",
  );
  assertEquals(
    key,
    "(campaign:urn%3Ali%3AsponsoredCampaign%3A337643194,conversion:urn%3Alla%3AllaPartnerConversion%3A70203)",
  );
});

// ------------------------------------------------------------------ json --

Deno.test("asJson: accepts a parsed value or a JSON string, rejects bad JSON and absence", () => {
  assertEquals(asJson({ a: 1 }, "x"), { a: 1 });
  assertEquals(asJson('{"a":1}', "x"), { a: 1 });
  assertThrows(() => asJson("{not json", "events"), Error, "events is not valid JSON");
  assertThrows(() => asJson(undefined, "events"), Error, "events is required");
  assertThrows(() => asJson("", "events"), Error, "events is required");
});

Deno.test("compact: drops undefined/null/empty-string, keeps false and 0", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: false, f: 0 }), {
    a: 1,
    e: false,
    f: 0,
  });
});

// ---------------------------------------------------------------- errors --

Deno.test("formatLinkedInConversionsError: surfaces the vendor's code and message verbatim", () => {
  const msg = formatLinkedInConversionsError(
    403,
    "GET",
    "/rest/conversions",
    JSON.stringify({ status: 403, code: "USER_NOT_AUTHORIZED", message: "not authorized" }),
  );
  assert(msg.includes("403"));
  assert(msg.includes("USER_NOT_AUTHORIZED"));
  assert(msg.includes("not authorized"));
});

Deno.test("formatLinkedInConversionsError: falls back to the raw body when it isn't the documented shape", () => {
  const msg = formatLinkedInConversionsError(500, "GET", "/rest/conversions", "upstream exploded");
  assert(msg.includes("500"));
  assert(msg.includes("upstream exploded"));
});

// ------------------------------------------------------------- transport --

Deno.test("LinkedInConversionsClient: sends the two Rest.li headers and the pinned version on every call", async () => {
  const { ctx, calls } = mockCtx([{ body: { elements: [] } }]);
  await new LinkedInConversionsClient(ctx).request("/rest/conversions");

  assertEquals(calls[0].headers["x-restli-protocol-version"], "2.0.0");
  assertEquals(calls[0].headers["linkedin-version"], API_VERSION);
  assertEquals(pathOf(calls[0].url), "/rest/conversions");
});

Deno.test("LinkedInConversionsClient: appends pre-built query values verbatim, drops empty strings", async () => {
  const { ctx, calls } = mockCtx([{ body: { elements: [] } }]);
  await new LinkedInConversionsClient(ctx).request("/rest/conversions", {
    query: { q: "account", account: "urn%3Ali%3AsponsoredAccount%3A1", empty: "" },
  });

  assertEquals(queryOf(calls[0].url).account, "urn:li:sponsoredAccount:1");
  assertEquals(queryOf(calls[0].url).q, "account");
  assert(!calls[0].url.includes("empty="), "empty-string query values must be dropped");
});

Deno.test("LinkedInConversionsClient: sets X-RestLi-Method when given one", async () => {
  const { ctx, calls } = mockCtx([{ body: { elements: [] } }]);
  await new LinkedInConversionsClient(ctx).request("/rest/conversions", {
    restliMethod: "BATCH_CREATE",
  });
  assertEquals(calls[0].headers["x-restli-method"], "BATCH_CREATE");
});

Deno.test("LinkedInConversionsClient: a 201 with an empty body and x-restli-id surfaces { id }", async () => {
  const { ctx } = mockCtx([createdResponse("104012")]);
  const result = await new LinkedInConversionsClient(ctx).request("/rest/conversions", {
    method: "POST",
  });
  assertEquals(result, { id: "104012" });
});

Deno.test("LinkedInConversionsClient: a 204 returns undefined", async () => {
  const { ctx } = mockCtx([noContentResponse()]);
  const result = await new LinkedInConversionsClient(ctx).request("/rest/campaignConversions/x", {
    method: "PUT",
  });
  assertEquals(result, undefined);
});

Deno.test("LinkedInConversionsClient: JSON body is sent with content-type application/json", async () => {
  const { ctx, calls } = mockCtx([createdResponse("1")]);
  await new LinkedInConversionsClient(ctx).request("/rest/conversions", {
    method: "POST",
    body: { name: "A" },
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { name: "A" });
});

Deno.test("LinkedInConversionsClient: a non-ok response throws with the formatted vendor error", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: errorBody("INVALID_ACCESS_TOKEN", "Invalid access token"),
  }]);
  await assertRejectsMessage(
    () => new LinkedInConversionsClient(ctx).request("/rest/conversions"),
    "INVALID_ACCESS_TOKEN",
  );
});

async function assertRejectsMessage(fn: () => Promise<unknown>, contains: string) {
  try {
    await fn();
  } catch (e) {
    assert(e instanceof Error);
    assert(e.message.includes(contains), e.message);
    return;
  }
  throw new Error("expected a rejection");
}
