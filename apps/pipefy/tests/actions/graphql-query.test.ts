import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import graphqlQuery from "../../actions/graphql-query.ts";

Deno.test("graphql-query: sends the raw query with variables", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { pipe: { id: "1", name: "Sales" } } } }]);
  const out = await graphqlQuery.execute(
    {
      query: "query($id: ID!) { pipe(id: $id) { id name } }",
      variables: { id: "1" },
    },
    ctx,
  ) as { data: unknown };
  assertEquals(out.data, { pipe: { id: "1", name: "Sales" } });
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.query, "query($id: ID!) { pipe(id: $id) { id name } }");
  assertEquals(body.variables, { id: "1" });
});

Deno.test("graphql-query: works with no variables at all", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { me: { id: "u1" } } } }]);
  await graphqlQuery.execute({ query: "{ me { id } }" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.query, "{ me { id } }");
  assertEquals("variables" in body, false);
});

Deno.test("graphql-query: type/resource metadata", () => {
  assertEquals(graphqlQuery.type, "perform");
  assertEquals(graphqlQuery.resource, "raw");
  assertEquals(graphqlQuery.idempotent, false);
});
