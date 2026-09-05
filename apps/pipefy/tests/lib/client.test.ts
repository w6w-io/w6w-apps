import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  compact,
  csv,
  csvIds,
  expectSuccess,
  gqlArgs,
  gqlEnum,
  gqlInput,
  gqlLiteral,
  jsonArg,
  jsonArrayArg,
  PipefyClient,
} from "../../lib/client.ts";

Deno.test("compact: drops undefined, null, empty string, empty array", () => {
  assertEquals(
    compact({ a: 1, b: undefined, c: null, d: "", e: [], g: false, h: 0 }),
    { a: 1, g: false, h: 0 },
  );
});

Deno.test("csv: splits and trims, or leaves unset", () => {
  assertEquals(csv("a, b ,c"), ["a", "b", "c"]);
  assertEquals(csv(undefined), undefined);
  assertEquals(csv(""), undefined);
});

Deno.test("csvIds: parses a comma-separated numeric id list", () => {
  assertEquals(csvIds("12345, 987654"), [12345, 987654]);
  assertEquals(csvIds(undefined), undefined);
  assertEquals(csvIds("not-a-number"), undefined);
});

Deno.test("jsonArg: parses a JSON object string, passes through an object, rejects an array", () => {
  assertEquals(jsonArg('{"a":1}', "f"), { a: 1 });
  assertEquals(jsonArg({ a: 1 }, "f"), { a: 1 });
  assertEquals(jsonArg(undefined, "f"), undefined);
  assertThrows(() => jsonArg("[1,2]", "f"), Error, "f");
});

Deno.test("jsonArrayArg: parses a JSON array string, passes through an array, rejects an object", () => {
  assertEquals(jsonArrayArg("[1,2]", "f"), [1, 2]);
  assertEquals(jsonArrayArg([1, 2], "f"), [1, 2]);
  assertEquals(jsonArrayArg(undefined, "f"), undefined);
  assertThrows(() => jsonArrayArg('{"a":1}', "f"), Error, "f");
});

Deno.test("gqlLiteral: numeric-looking strings and numbers are unquoted", () => {
  assertEquals(gqlLiteral(123), "123");
  assertEquals(gqlLiteral("123"), "123");
  assertEquals(gqlLiteral(-5), "-5");
});

Deno.test("gqlLiteral: a non-numeric string is quoted and escaped", () => {
  assertEquals(gqlLiteral("ZtEdWh"), '"ZtEdWh"');
  assertEquals(gqlLiteral('a "quote"'), '"a \\"quote\\""');
});

Deno.test("gqlLiteral: booleans, null, arrays and objects", () => {
  assertEquals(gqlLiteral(true), "true");
  assertEquals(gqlLiteral(null), "null");
  assertEquals(gqlLiteral(undefined), "null");
  assertEquals(gqlLiteral([1, "a", true]), '[1, "a", true]');
  assertEquals(gqlLiteral({ a: 1, b: "x" }), '{ a: 1, b: "x" }');
});

Deno.test("gqlLiteral: an enum wrapper is emitted bare, unquoted", () => {
  assertEquals(gqlLiteral(gqlEnum("green")), "green");
});

Deno.test("gqlEnum: undefined/empty stays unset", () => {
  assertEquals(gqlEnum(undefined), undefined);
  assertEquals(gqlEnum(""), undefined);
});

Deno.test("gqlInput: drops unset fields and wraps in braces", () => {
  assertEquals(gqlInput({ id: "123", name: undefined, title: "x" }), '{ id: 123, title: "x" }');
});

Deno.test("gqlArgs: a bare comma-joined list, no braces", () => {
  assertEquals(gqlArgs({ pipe_id: "123", first: 20, after: undefined }), "pipe_id: 123, first: 20");
});

Deno.test("gqlArgs: an object argument still nests with braces", () => {
  assertEquals(
    gqlArgs({ search: { title: "hi" } }),
    'search: { title: "hi" }',
  );
});

Deno.test("PipefyClient.send: posts to the single GraphQL endpoint", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { me: { id: "u1" } } } }]);
  await new PipefyClient(ctx).send("{ me { id } }");
  assertEquals(calls[0].url, "https://api.pipefy.com/graphql");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assert(!("authorization" in calls[0].headers), "client must not set Authorization itself");
  assertEquals(JSON.parse(calls[0].body!), { query: "{ me { id } }" });
});

Deno.test("PipefyClient.send: includes variables only when supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { pipe: { id: "1" } } } }]);
  await new PipefyClient(ctx).send("query($id:ID!){ pipe(id:$id){id} }", { id: "1" });
  assertEquals(JSON.parse(calls[0].body!), {
    query: "query($id:ID!){ pipe(id:$id){id} }",
    variables: { id: "1" },
  });
});

Deno.test("PipefyClient.send: throws on the REST-flavored unauthorized envelope", async () => {
  const { ctx } = mockCtx([{
    body: {
      errors: [{ title: "Unauthorized", detail: "You are not authorized to access this page" }],
    },
  }]);
  await assertRejects(
    () => new PipefyClient(ctx).send("{ me { id } }"),
    Error,
    "Unauthorized: You are not authorized to access this page",
  );
});

Deno.test("PipefyClient.send: throws on the OAuth2-flavored invalid_token envelope", async () => {
  const { ctx } = mockCtx([{
    body: { error: "invalid_token", error_description: "The access token is invalid" },
  }]);
  await assertRejects(
    () => new PipefyClient(ctx).send("{ me { id } }"),
    Error,
    "The access token is invalid",
  );
});

Deno.test("PipefyClient.send: throws on a GraphQL validation error with message/locations/path", async () => {
  const { ctx } = mockCtx([{
    body: { data: { pipe: null }, errors: [{ message: "Cannot query field 'x'" }] },
  }]);
  await assertRejects(
    () => new PipefyClient(ctx).send("{ pipe(id:1) { x } }"),
    Error,
    "Cannot query field",
  );
});

Deno.test("PipefyClient.send: throws on a non-2xx with no errors[]", async () => {
  const { ctx } = mockCtx([{ status: 500, statusText: "Internal", body: "oops" }]);
  await assertRejects(() => new PipefyClient(ctx).send("{ me { id } }"), Error, "500");
});

Deno.test("PipefyClient.send: throws on non-JSON body", async () => {
  const { ctx } = mockCtx([{
    body: "<html>not json</html>",
    headers: { "content-type": "text/html" },
  }]);
  await assertRejects(() => new PipefyClient(ctx).send("{ me { id } }"), Error, "non-JSON");
});

Deno.test("PipefyClient.send: returns the validated data object", async () => {
  const { ctx } = mockCtx([{ body: { data: { me: { id: "u1" } } } }]);
  const data = await new PipefyClient(ctx).send<{ me: { id: string } }>("{ me { id } }");
  assertEquals(data.me.id, "u1");
});

Deno.test("expectSuccess: returns the payload when success is true", () => {
  const data = { deleteCard: { success: true } };
  assertEquals(expectSuccess<{ success: boolean }>(data, "deleteCard").success, true);
});

Deno.test("expectSuccess: throws when success is false", () => {
  assertThrows(
    () => expectSuccess({ deleteCard: { success: false } }, "deleteCard"),
    Error,
    "deleteCard",
  );
});

Deno.test("expectSuccess: throws when the field is entirely missing", () => {
  assertThrows(() => expectSuccess({}, "deleteCard"), Error, "deleteCard");
});
