import { assertEquals, assertThrows } from "@std/assert";
import {
  apiHostFromConnection,
  campaignsPath,
  compact,
  formatCampaignsError,
  parseJsonParam,
  unwrapEnvelope,
  ZohoCampaignsClient,
} from "../../lib/client.ts";
import { mockCampaignsCtx } from "../_helpers.ts";

Deno.test("apiHostFromConnection: reads the recorded region host", () => {
  assertEquals(
    apiHostFromConnection({ display: { apiHost: "campaigns.zoho.eu" } } as never),
    "campaigns.zoho.eu",
  );
});

Deno.test("apiHostFromConnection: falls back to the US host when unrecorded", () => {
  assertEquals(apiHostFromConnection(undefined), "campaigns.zoho.com");
});

Deno.test("campaignsPath: prefixes json/ only for the four format-in-path endpoints", () => {
  assertEquals(campaignsPath("listsubscribe"), "json/listsubscribe");
  assertEquals(campaignsPath("listunsubscribe"), "json/listunsubscribe");
  assertEquals(campaignsPath("contactdonotmail"), "json/contactdonotmail");
  assertEquals(campaignsPath("clonecampaign"), "json/clonecampaign");
  assertEquals(campaignsPath("getmailinglists"), "getmailinglists");
  assertEquals(campaignsPath("deletecampaign"), "deletecampaign");
});

Deno.test("formatCampaignsError: reads the lowercase code on a success-shaped envelope", () => {
  const msg = formatCampaignsError(
    400,
    "POST",
    "/api/v1.1/updatelistdetails",
    JSON.stringify({ status: "error", code: "2102", message: "Listkey is empty or invalid." }),
  );
  assertEquals(
    msg,
    "Zoho Campaigns 400 (code 2102) for POST /api/v1.1/updatelistdetails: Listkey is empty or invalid.",
  );
});

Deno.test("formatCampaignsError: reads the capitalized Code on the vendor's own error shape", () => {
  const msg = formatCampaignsError(
    401,
    "GET",
    "/api/v1.1/getmailinglists",
    JSON.stringify({ status: "error", Code: "1007", message: "Unauthorized request." }),
  );
  assertEquals(
    msg,
    "Zoho Campaigns 401 (code 1007) for GET /api/v1.1/getmailinglists: Unauthorized request.",
  );
});

Deno.test("formatCampaignsError: falls back to the raw body when it is not JSON", () => {
  const msg = formatCampaignsError(500, "GET", "/api/v1.1/getmailinglists", "<html>oops</html>");
  assertEquals(msg, "Zoho Campaigns 500 for GET /api/v1.1/getmailinglists: <html>oops</html>");
});

Deno.test("unwrapEnvelope: passes a flat body through unchanged", () => {
  assertEquals(unwrapEnvelope({ status: "success", code: "0", listkey: "abc" }), {
    status: "success",
    code: "0",
    listkey: "abc",
  });
});

Deno.test("unwrapEnvelope: unwraps a nested response body", () => {
  assertEquals(unwrapEnvelope({ response: { message: "Success", code: "200" } }), {
    message: "Success",
    code: "200",
  });
});

Deno.test("compact: drops undefined/null/empty-string but keeps false and 0", () => {
  assertEquals(
    compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }),
    { d: false, e: 0, f: "x" },
  );
});

Deno.test("parseJsonParam: parses a JSON string and rejects non-objects", () => {
  assertEquals(parseJsonParam('{"Contact Email":"a@b.com"}', "contactInfo"), {
    "Contact Email": "a@b.com",
  });
  assertThrows(() => parseJsonParam(undefined, "contactInfo"), Error, "required");
  assertThrows(() => parseJsonParam("[1,2]", "contactInfo"), Error, "JSON object");
});

Deno.test("ZohoCampaignsClient: builds the request against the connection's region host, resfmt=JSON in the query, no body", async () => {
  const { ctx, calls } = mockCampaignsCtx(
    [{ body: { status: "success", code: "0", list_of_details: [] } }],
    "campaigns.zoho.eu",
  );
  const body = await new ZohoCampaignsClient(ctx).request("getmailinglists", {
    query: { sort: "asc" },
  });
  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.hostname, "campaigns.zoho.eu");
  assertEquals(url.pathname, "/api/v1.1/getmailinglists");
  assertEquals(url.searchParams.get("resfmt"), "JSON");
  assertEquals(url.searchParams.get("sort"), "asc");
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].body, null);
  assertEquals(body, { status: "success", code: "0", list_of_details: [] });
});

Deno.test("ZohoCampaignsClient: uses type=json instead of resfmt=JSON when formatParam is 'type'", async () => {
  const { ctx, calls } = mockCampaignsCtx([{ body: { response: { code: "0" } } }]);
  await new ZohoCampaignsClient(ctx).request("contact/allfields", { formatParam: "type" });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("type"), "json");
  assertEquals(url.searchParams.has("resfmt"), false);
});

Deno.test("ZohoCampaignsClient: even a documented POST sends parameters as a query string, no body", async () => {
  const { ctx, calls } = mockCampaignsCtx([{ body: { status: "success", code: "0" } }]);
  await new ZohoCampaignsClient(ctx).request("updatelistdetails", {
    method: "POST",
    query: { listkey: "abc", newlistname: "New name", signupform: "public" },
  });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].body, null);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("listkey"), "abc");
  assertEquals(url.searchParams.get("newlistname"), "New name");
});

Deno.test("ZohoCampaignsClient: throws a formatted error on a non-ok response", async () => {
  const { ctx } = mockCampaignsCtx([
    { status: 401, body: { status: "error", Code: "1007", message: "Unauthorized request." } },
  ]);
  await assertRejectsWithMessage(
    () => new ZohoCampaignsClient(ctx).request("getmailinglists"),
    "Zoho Campaigns 401 (code 1007)",
  );
});

Deno.test("ZohoCampaignsClient: throws when the HTTP status is 200 but the envelope says status:error", async () => {
  const { ctx } = mockCampaignsCtx([
    {
      status: 200,
      body: { status: "error", code: "903", message: "Mandatory fields are missing." },
    },
  ]);
  await assertRejectsWithMessage(
    () => new ZohoCampaignsClient(ctx).request("addlistandcontacts", { method: "POST" }),
    "Zoho Campaigns 200 (code 903)",
  );
});

async function assertRejectsWithMessage(fn: () => Promise<unknown>, needle: string) {
  try {
    await fn();
    throw new Error("expected rejection");
  } catch (e) {
    if (!(e instanceof Error) || !e.message.includes(needle)) throw e;
  }
}
