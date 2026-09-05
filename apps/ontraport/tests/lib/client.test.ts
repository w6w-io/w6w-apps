import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  API_BASE,
  API_PREFIX,
  compact,
  formatOntraportError,
  isAuthFailureBody,
  OntraportClient,
  toCommaList,
} from "../../lib/client.ts";
import {
  authFailureResponse,
  envelope,
  listEnvelope,
  mockCtx,
  pathOf,
  queryOf,
} from "../_helpers.ts";

Deno.test("client: API_BASE and API_PREFIX are the one documented host and version", () => {
  assertEquals(API_BASE, "https://api.ontraport.com");
  assertEquals(API_PREFIX, "/1");
});

Deno.test("client: data() unwraps the envelope", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "7", firstname: "Mary" }) }]);
  const out = await new OntraportClient(ctx).data("/Contact", { query: { id: "7" } }) as {
    firstname: string;
  };
  assertEquals(pathOf(calls[0].url), "/1/Contact");
  assertEquals(queryOf(calls[0].url), { id: "7" });
  assertEquals(out.firstname, "Mary");
});

Deno.test("client: list() surfaces items and the (numeric) count", async () => {
  const { ctx } = mockCtx([{ body: listEnvelope([{ id: "1" }, { id: "2" }], 2) }]);
  const { items, count } = await new OntraportClient(ctx).list("/Contacts");
  assertEquals(items.length, 2);
  assertEquals(count, 2);
});

Deno.test("client: list() defaults count to undefined when the vendor omits it", async () => {
  const { ctx } = mockCtx([{ body: listEnvelope([{ id: "1" }]) }]);
  const { count } = await new OntraportClient(ctx).list("/Contacts");
  assertEquals(count, undefined);
});

Deno.test("client: a JSON body request sends content-type application/json", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "1" }) }]);
  await new OntraportClient(ctx).data("/objects", { body: { objectID: 0, firstname: "Mary" } });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { objectID: 0, firstname: "Mary" });
});

Deno.test("client: a form body request sends content-type application/x-www-form-urlencoded", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "1" }) }]);
  await new OntraportClient(ctx).data("/Contacts", {
    form: { firstname: "Mary", email: "m@x.com" },
  });
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(calls[0].body, "firstname=Mary&email=m%40x.com");
});

Deno.test("client: a form value that is an object is JSON-stringified, not [object Object]", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "1" }) }]);
  await new OntraportClient(ctx).data("/Contacts", { form: { f1500: { a: 1 } } });
  assertEquals(new URLSearchParams(calls[0].body!).get("f1500"), '{"a":1}');
});

Deno.test("client: query params drop undefined/null/empty-string values", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await new OntraportClient(ctx).list("/Contacts", {
    query: { ids: undefined, search: "", range: 50, sort: "lastname" },
  });
  assertEquals(queryOf(calls[0].url), { range: "50", sort: "lastname" });
});

Deno.test("client: a non-JSON, plain-text auth-failure body does not throw JSON.parse", async () => {
  const { ctx } = mockCtx([authFailureResponse()]);
  const err = await assertRejects(() =>
    new OntraportClient(ctx).data("/Contact", { query: { id: "1" } })
  );
  assert(err instanceof Error);
  assert(/does not authenticate/i.test(err.message), err.message);
});

Deno.test("isAuthFailureBody: matches the exact vendor sentence, case-insensitively", () => {
  assert(isAuthFailureBody("Your App ID and API Key do not authenticate."));
  assert(isAuthFailureBody("YOUR APP ID AND API KEY DO NOT AUTHENTICATE."));
  assert(!isAuthFailureBody('{"code":0,"data":{}}'));
});

Deno.test("formatOntraportError: an auth failure body is reported as such, not as opaque HTML", () => {
  const msg = formatOntraportError(
    401,
    "GET",
    "/Contacts/getInfo",
    "Your App ID and API Key do not authenticate.",
  );
  assert(/does not authenticate/i.test(msg), msg);
});

Deno.test("formatOntraportError: a JSON error body surfaces its message", () => {
  const msg = formatOntraportError(
    400,
    "POST",
    "/Contacts",
    JSON.stringify({ code: 1, message: "Bad email" }),
  );
  assert(msg.includes("Bad email"), msg);
});

Deno.test("formatOntraportError: an unparsable, non-auth body is truncated rather than thrown on", () => {
  const raw = "x".repeat(1000);
  const msg = formatOntraportError(500, "GET", "/Contacts", raw);
  assert(msg.length < raw.length + 100, msg.length.toString());
  assert(msg.includes("truncated"), msg);
});

Deno.test("compact: drops undefined/null/empty-string, keeps false and 0", () => {
  assertEquals(compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }), {
    d: false,
    e: 0,
    f: "x",
  });
});

Deno.test("toCommaList: normalises an array or a pre-joined string, drops blanks", () => {
  assertEquals(toCommaList(["1", " 2 ", ""]), "1,2");
  assertEquals(toCommaList("1, 2, 3"), "1,2,3");
  assertEquals(toCommaList(undefined), undefined);
  assertEquals(toCommaList(""), undefined);
});
