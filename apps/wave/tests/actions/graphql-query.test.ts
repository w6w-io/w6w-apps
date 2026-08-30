import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import graphqlQuery from "../../actions/graphql-query.ts";

Deno.test("graphql-query: forwards the query and variables verbatim", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { user: { id: "u1" } } } }]);
  const out = await graphqlQuery.execute(
    { query: "query { user { id } }", variables: { a: 1 } },
    ctx,
  ) as { data: unknown };
  assertEquals(out.data, { user: { id: "u1" } });
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.query, "query { user { id } }");
  assertEquals(body.variables, { a: 1 });
});

Deno.test("graphql-query: still throws on transport-level errors[]", async () => {
  const { ctx } = mockCtx([{
    body: { errors: [{ message: "Unknown field." }] },
  }]);
  await assertRejects(
    async () => {
      await graphqlQuery.execute({ query: "query { bogus }" }, ctx);
    },
    Error,
    "Unknown field",
  );
});

Deno.test("graphql-query: a string `variables` param is parsed as JSON", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await graphqlQuery.execute({ query: "query { user { id } }", variables: '{"a":1}' }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.variables, { a: 1 });
});

Deno.test("graphql-query: type/resource/idempotency metadata", () => {
  assertEquals(graphqlQuery.type, "perform");
  assertEquals(graphqlQuery.resource, "raw");
  assertEquals(graphqlQuery.idempotent, false);
});
