import { assertEquals, assertRejects } from "@std/assert";
import {
  entityPath,
  formatJibbleError,
  JibbleClient,
  odataParams,
  toList,
  WORKSPACE_HOST,
} from "../../lib/client.ts";
import { errorBody, mockCtx, odataList, pathOf, queryAllOf, queryOf } from "../_helpers.ts";

Deno.test("odataParams: translates camelCase keys into $-prefixed OData keys", () => {
  assertEquals(
    odataParams({ select: "id,name", filter: "status eq 'Active'", top: 10, skip: 5, count: true }),
    {
      "$select": "id,name",
      "$filter": "status eq 'Active'",
      "$top": "10",
      "$skip": "5",
      "$count": "true",
    },
  );
});

Deno.test("odataParams: omits unset keys entirely", () => {
  assertEquals(odataParams({}), {});
});

Deno.test("entityPath: builds an unquoted OData-parenthesis id path", () => {
  assertEquals(
    entityPath("People", "558b5111-31a0-423c-8ea1-1f5a0d20faba"),
    "/v1/People(558b5111-31a0-423c-8ea1-1f5a0d20faba)",
  );
});

Deno.test("toList: normalises array or CSV input, dropping blanks", () => {
  assertEquals(toList(["a", " b ", ""]), ["a", "b"]);
  assertEquals(toList("a, b ,c"), ["a", "b", "c"]);
  assertEquals(toList(undefined), undefined);
  assertEquals(toList(""), undefined);
});

Deno.test("formatJibbleError: surfaces the vendor's code and message, not the raw trace", () => {
  const raw = JSON.stringify({
    error: {
      code: "feature_restricted_subscription",
      message: "Current subscription not allows usage of Client entities",
      innererror: { trace: ["   at Jibble.Auth.Client.EntityRestrictionHandler..."] },
    },
  });
  const message = formatJibbleError(402, "POST", "/v1/Clients", raw);
  assertEquals(
    message,
    "Jibble 402 feature_restricted_subscription for POST /v1/Clients: " +
      "Current subscription not allows usage of Client entities",
  );
  assertEquals(message.includes("EntityRestrictionHandler"), false);
});

Deno.test("formatJibbleError: falls back to the raw body when it isn't the error envelope", () => {
  const message = formatJibbleError(500, "GET", "/v1/People", "Internal Server Error");
  assertEquals(message, "Jibble 500 for GET /v1/People: Internal Server Error");
});

Deno.test("JibbleClient.list: unwraps the @odata.count/value envelope", async () => {
  const { ctx, calls } = mockCtx([{ body: odataList([{ id: "p1" }], 12) }]);
  const page = await new JibbleClient(ctx).list(WORKSPACE_HOST, "/v1/People", { top: 5 });

  assertEquals(pathOf(calls[0].url), "/v1/People");
  assertEquals(queryOf(calls[0].url)["$top"], "5");
  assertEquals(page.items, [{ id: "p1" }]);
  assertEquals(page.count, 12);
});

Deno.test("JibbleClient: a string[] query value is sent as a repeated key", async () => {
  const { ctx, calls } = mockCtx([{ body: odataList([]) }]);
  await new JibbleClient(ctx).json(WORKSPACE_HOST, "/v1/TrackedTimeReport", {
    query: { personIds: ["a", "b"] },
  });
  assertEquals(queryAllOf(calls[0].url, "personIds"), ["a", "b"]);
});

Deno.test("JibbleClient.status: returns the status code without requiring a JSON body", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  const status = await new JibbleClient(ctx).status(WORKSPACE_HOST, "/v1/People(x)", {
    method: "PATCH",
    body: { status: "Removed" },
  });
  assertEquals(status, 204);
});

Deno.test("JibbleClient: a non-ok response throws a formatted error", async () => {
  const { ctx } = mockCtx([{
    status: 402,
    body: errorBody("feature_restricted_subscription", "nope"),
  }]);
  await assertRejects(
    () => new JibbleClient(ctx).json(WORKSPACE_HOST, "/v1/Clients", { method: "POST", body: {} }),
    Error,
    "feature_restricted_subscription",
  );
});
