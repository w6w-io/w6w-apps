import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  asOptionalJson,
  compact,
  errorMessage,
  jsonApiBody,
  LemonSqueezyClient,
  relationshipRef,
  relationshipRefs,
} from "../../lib/client.ts";
import { envelope, errorBody, listEnvelope, mockCtx } from "../_helpers.ts";

Deno.test("compact: drops undefined and empty string, keeps null/false/0", () => {
  assertEquals(
    compact({ a: 1, b: undefined, c: null, d: "", e: false, f: 0, g: "x" }),
    { a: 1, c: null, e: false, f: 0, g: "x" },
  );
});

Deno.test("jsonApiBody: builds { data: { type, attributes } } and drops unset attributes", () => {
  assertEquals(
    jsonApiBody("customers", { name: "John", email: undefined }),
    { data: { type: "customers", attributes: { name: "John" } } },
  );
});

Deno.test("jsonApiBody: includes id for updates and relationships when given", () => {
  assertEquals(
    jsonApiBody("customers", { name: "John" }, { store: relationshipRef("stores", "1") }, "42"),
    {
      data: {
        type: "customers",
        id: "42",
        attributes: { name: "John" },
        relationships: { store: { data: { type: "stores", id: "1" } } },
      },
    },
  );
});

Deno.test("jsonApiBody: omits an empty relationships object entirely", () => {
  assertEquals(
    jsonApiBody("customers", { name: "John" }, {}),
    { data: { type: "customers", attributes: { name: "John" } } },
  );
});

Deno.test("relationshipRef: builds a single JSON:API pointer, or undefined when unset", () => {
  assertEquals(relationshipRef("stores", "1"), { data: { type: "stores", id: "1" } });
  assertEquals(relationshipRef("stores", 1), { data: { type: "stores", id: "1" } });
  assertEquals(relationshipRef("stores", undefined), undefined);
  assertEquals(relationshipRef("stores", ""), undefined);
});

Deno.test("relationshipRefs: splits a comma-separated id list into JSON:API pointers", () => {
  assertEquals(
    relationshipRefs("variants", "1, 2 ,3"),
    {
      data: [{ type: "variants", id: "1" }, { type: "variants", id: "2" }, {
        type: "variants",
        id: "3",
      }],
    },
  );
  assertEquals(relationshipRefs("variants", undefined), undefined);
  assertEquals(relationshipRefs("variants", ""), undefined);
});

Deno.test("asOptionalJson: passes objects through and parses strings", () => {
  assertEquals(asOptionalJson({ a: 1 }, "X"), { a: 1 });
  assertEquals(asOptionalJson('{"a":1}', "X"), { a: 1 });
  assertEquals(asOptionalJson("", "X"), undefined);
  assertEquals(asOptionalJson(undefined, "X"), undefined);
});

Deno.test("asOptionalJson: names the field when the string is not JSON", () => {
  let message = "";
  try {
    asOptionalJson("{nope", "Custom data");
  } catch (err) {
    message = (err as Error).message;
  }
  assertEquals(message, "Custom data is not valid JSON");
});

Deno.test("errorMessage: joins title and detail from the JSON:API error object", () => {
  const raw = JSON.stringify(errorBody("401", "Unauthorized", "Unauthenticated."));
  assertEquals(errorMessage(raw), "Unauthorized: Unauthenticated.");
});

Deno.test("errorMessage: falls back to the raw body when it is not JSON", () => {
  assertEquals(errorMessage("<html>bad gateway</html>"), "<html>bad gateway</html>");
});

Deno.test("errorMessage: empty input yields empty output", () => {
  assertEquals(errorMessage(""), "");
});

Deno.test("client: sends BOTH Accept and Content-Type on every request, even a bare GET", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "1" }) }]);
  await new LemonSqueezyClient(ctx).request("/products/1");
  assertEquals(calls[0].headers["accept"], "application/vnd.api+json");
  assertEquals(calls[0].headers["content-type"], "application/vnd.api+json");
  assertEquals(calls[0].method, "GET");
});

Deno.test("client: bracketed query keys survive verbatim (page[number], filter[store_id])", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await new LemonSqueezyClient(ctx).request("/products", {
    query: { "filter[store_id]": "9", "page[number]": 2, "page[size]": 50 },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("filter[store_id]"), "9");
  assertEquals(url.searchParams.get("page[number]"), "2");
  assertEquals(url.searchParams.get("page[size]"), "50");
});

Deno.test("client: drops empty/undefined/null query values instead of sending blanks", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await new LemonSqueezyClient(ctx).request("/products", {
    query: { a: undefined, b: null, c: "" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("a"), null);
  assertEquals(url.searchParams.get("b"), null);
  assertEquals(url.searchParams.get("c"), null);
});

Deno.test("client: a write sends the JSON:API body verbatim", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "1" }) }]);
  await new LemonSqueezyClient(ctx).request("/customers", {
    method: "POST",
    body: jsonApiBody("customers", { name: "John" }),
  });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].body, '{"data":{"type":"customers","attributes":{"name":"John"}}}');
});

Deno.test("client: request returns the full envelope, not just data — meta/links survive", async () => {
  const { ctx } = mockCtx([{ body: listEnvelope([{ id: "1" }]) }]);
  const result = await new LemonSqueezyClient(ctx).request("/products");
  assertEquals((result.data as unknown[]).length, 1);
  assert(result.meta?.page);
  assert(result.links?.first);
});

Deno.test("client: a 204 resolves to an empty object rather than throwing on an empty body", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(
    await new LemonSqueezyClient(ctx).request("/discounts/1", { method: "DELETE" }),
    {},
  );
});

Deno.test("client: a non-2xx throws with Lemon Squeezy's own error text", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: errorBody("401", "Unauthorized", "Unauthenticated.") },
  ]);
  await assertRejects(
    async () => {
      await new LemonSqueezyClient(ctx).request("/users/me");
    },
    Error,
    "Unauthenticated.",
  );
});

/** The action worker must never see or build an Authorization header — that is sign's job. */
Deno.test("client: never sets an authorization header", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "1" }) }]);
  await new LemonSqueezyClient(ctx).request("/products/1");
  assertEquals(calls[0].headers["authorization"], undefined);
});
