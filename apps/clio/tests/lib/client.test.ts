import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  apiBase,
  apiBaseFor,
  ClioClient,
  compact,
  formatClioError,
  idRef,
  nextPageToken,
  regionFromConnection,
} from "../../lib/client.ts";
import {
  bearerErrorBody,
  envelope,
  errorBody,
  listEnvelope,
  mockCtx,
  mockCtxWithRegion,
  pathOf,
} from "../_helpers.ts";

Deno.test("apiBaseFor: builds the four documented regional hosts", () => {
  assertEquals(apiBaseFor("us"), "https://app.clio.com/api/v4");
  assertEquals(apiBaseFor("eu"), "https://eu.app.clio.com/api/v4");
  assertEquals(apiBaseFor("ca"), "https://ca.app.clio.com/api/v4");
  assertEquals(apiBaseFor("au"), "https://au.app.clio.com/api/v4");
});

Deno.test("regionFromConnection: defaults to us when display carries no region", () => {
  assertEquals(regionFromConnection(undefined), "us");
  assertEquals(regionFromConnection({ display: {} } as never), "us");
  assertEquals(regionFromConnection({ display: { region: "not-a-region" } } as never), "us");
});

Deno.test("regionFromConnection: reads a valid region off display", () => {
  assertEquals(regionFromConnection({ display: { region: "eu" } } as never), "eu");
  assertEquals(regionFromConnection({ display: { region: "au" } } as never), "au");
});

Deno.test("apiBase: resolves from ctx.connection.display.region", () => {
  const { ctx } = mockCtxWithRegion([], "ca");
  assertEquals(apiBase(ctx), "https://ca.app.clio.com/api/v4");
});

Deno.test("compact: drops undefined/null/empty but keeps false and 0", () => {
  assertEquals(compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }), {
    d: false,
    e: 0,
    f: "x",
  });
});

Deno.test("idRef: wraps a numeric id, and drops empty ids entirely", () => {
  assertEquals(idRef(123), { id: 123 });
  assertEquals(idRef("456"), { id: 456 });
  assertEquals(idRef(undefined), undefined);
  assertEquals(idRef(null), undefined);
  assertEquals(idRef(""), undefined);
});

Deno.test("idRef: rejects a non-numeric id rather than sending garbage", () => {
  let threw = false;
  try {
    idRef("not-a-number");
  } catch {
    threw = true;
  }
  assert(threw);
});

Deno.test("nextPageToken: extracts page_token from a meta.paging URL", () => {
  assertEquals(
    nextPageToken("https://app.clio.com/api/v4/contacts?fields=id&page_token=abc123"),
    "abc123",
  );
  assertEquals(nextPageToken(undefined), undefined);
  assertEquals(nextPageToken("not a url"), undefined);
});

// --- the two 401 shapes, pinned at the formatter level -----------------------

Deno.test("formatClioError: the OpenAPI-documented object-error shape", () => {
  const msg = formatClioError(
    401,
    "GET",
    "/users/who_am_i.json",
    JSON.stringify(errorBody("UnauthorizedError", "User is not authorized")),
  );
  assert(msg.includes("UnauthorizedError"), msg);
  assert(msg.includes("User is not authorized"), msg);
});

Deno.test("formatClioError: the RFC 6750 bearer-challenge shape, where error is a STRING", () => {
  const msg = formatClioError(
    401,
    "GET",
    "/users/who_am_i.json",
    JSON.stringify(
      bearerErrorBody(
        "The access token provided is expired, revoked, malformed or invalid for other reasons.",
      ),
    ),
  );
  assert(msg.includes("invalid_token"), msg);
  assert(msg.includes("expired, revoked"), msg);
});

Deno.test("formatClioError: an unparsable body still produces a readable message", () => {
  const msg = formatClioError(500, "GET", "/matters.json", "upstream exploded");
  assert(msg.includes("500"), msg);
  assert(msg.includes("upstream exploded"), msg);
});

// --- ClioClient ---------------------------------------------------------------

Deno.test("ClioClient.data: unwraps the data envelope", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 1, description: "test matter" }) }]);
  const out = await new ClioClient(ctx).data<{ description: string }>("/matters/1.json");
  assertEquals(pathOf(calls[0].url), "/api/v4/matters/1.json");
  assertEquals(out.description, "test matter");
});

Deno.test("ClioClient.list: unwraps data and extracts page tokens from meta.paging", async () => {
  const { ctx } = mockCtx([{
    body: listEnvelope([{ id: 1 }, { id: 2 }], {
      next: "https://app.clio.com/api/v4/matters?page_token=next123",
      previous: "https://app.clio.com/api/v4/matters?page_token=prev456",
    }),
  }]);
  const out = await new ClioClient(ctx).list("/matters.json");
  assertEquals(out.items.length, 2);
  assertEquals(out.nextPageToken, "next123");
  assertEquals(out.previousPageToken, "prev456");
});

Deno.test("ClioClient.list: no next/previous token when meta.paging is absent", async () => {
  const { ctx } = mockCtx([{ body: listEnvelope([{ id: 1 }]) }]);
  const out = await new ClioClient(ctx).list("/matters.json");
  assertEquals(out.nextPageToken, undefined);
  assertEquals(out.previousPageToken, undefined);
});

Deno.test("ClioClient: a POST body is wrapped in {data: ...}", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope({ id: 9 }) }]);
  await new ClioClient(ctx).data("/matters.json", {
    method: "POST",
    body: { description: "new matter" },
  });
  assertEquals(JSON.parse(calls[0].body!), { data: { description: "new matter" } });
});

Deno.test("ClioClient: undefined/null/empty query values are omitted from the URL", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([]) }]);
  await new ClioClient(ctx).list("/matters.json", {
    query: { status: undefined, client_id: null as unknown as undefined, query: "" },
  });
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("ClioClient: a non-ok response throws a formatted error, not a raw body", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: errorBody("record_not_found", "Matter was not found."),
  }]);
  const err = await assertRejects(() => new ClioClient(ctx).data("/matters/999.json"), Error);
  assert(err.message.includes("record_not_found"), err.message);
  assert(err.message.includes("Matter was not found."), err.message);
});

Deno.test("ClioClient.status: reports 204 without trying to parse a body", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  const status = await new ClioClient(ctx).status("/matters/1.json", { method: "DELETE" });
  assertEquals(status, 204);
});

Deno.test("ClioClient.redirectLocation: returns the Location header of a 303 without following it", async () => {
  const target = "https://clio-manage-prod-us-a-documents.s3.us-east-1.amazonaws.com/signed?x=1";
  const { ctx, calls } = mockCtx([
    { status: 303, headers: { location: target } },
  ]);
  const location = await new ClioClient(ctx).redirectLocation("/documents/1/download.json");
  assertEquals(location, target);
  assertEquals(calls[0].redirect, "manual");
});

Deno.test("ClioClient.redirectLocation: a non-redirect response is an error", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: errorBody("record_not_found", "no such document"),
  }]);
  await assertRejects(
    () => new ClioClient(ctx).redirectLocation("/documents/1/download.json"),
    Error,
  );
});

Deno.test("ClioClient.redirectLocation: a redirect with no Location header is an error", async () => {
  const { ctx } = mockCtx([{ status: 303 }]);
  await assertRejects(
    () => new ClioClient(ctx).redirectLocation("/documents/1/download.json"),
    Error,
  );
});

Deno.test("ClioClient: requests use the region carried on ctx.connection", async () => {
  const { ctx, calls } = mockCtxWithRegion([{ body: envelope({ id: 1 }) }], "eu");
  await new ClioClient(ctx).data("/matters/1.json");
  assert(calls[0].url.startsWith("https://eu.app.clio.com/api/v4"), calls[0].url);
});
