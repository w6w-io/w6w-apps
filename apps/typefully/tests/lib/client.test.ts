import { assertEquals, assertRejects } from "@std/assert";
import { compact, formatTypefullyError, toList, TypefullyClient } from "../../lib/client.ts";
import { mockCtx, pathOf, queryAllOf, queryOf } from "../_helpers.ts";

Deno.test("compact: drops undefined, null and empty string but keeps false and 0", () => {
  assertEquals(
    compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }),
    { d: false, e: 0, f: "x" },
  );
});

Deno.test("toList: splits a comma string and trims", () => {
  assertEquals(toList("a, b ,c"), ["a", "b", "c"]);
  assertEquals(toList(["a", "b"]), ["a", "b"]);
  assertEquals(toList(""), undefined);
  assertEquals(toList(undefined), undefined);
});

Deno.test("formatTypefullyError: surfaces the vendor's code and field details verbatim", () => {
  const msg = formatTypefullyError(
    422,
    "POST",
    "/v2/social-sets/1/drafts",
    JSON.stringify({
      error: {
        code: "VALIDATION_ERROR",
        message: "Some fields are invalid.",
        details: [{ field: "platforms.x.posts.0.text", message: "Must not be empty." }],
      },
    }),
  );
  assertEquals(msg.includes("VALIDATION_ERROR"), true);
  assertEquals(msg.includes("platforms.x.posts.0.text"), true);
  assertEquals(msg.includes("Must not be empty."), true);
});

Deno.test("formatTypefullyError: falls back to the raw body when it isn't the error envelope", () => {
  const msg = formatTypefullyError(500, "GET", "/v2/me", "<html>oops</html>");
  assertEquals(msg.includes("500"), true);
  assertEquals(msg.includes("<html>oops</html>"), true);
});

Deno.test("TypefullyClient: sends the accept header and parses JSON", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, name: "Ada" } }]);
  const out = await new TypefullyClient(ctx).json("/me");
  assertEquals(pathOf(calls[0].url), "/v2/me");
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(out, { id: 1, name: "Ada" });
});

Deno.test("TypefullyClient: query object values are set, array values are repeated keys", async () => {
  const { ctx, calls } = mockCtx([{ body: { results: [] } }]);
  await new TypefullyClient(ctx).json("/social-sets/1/drafts", {
    query: { status: "draft", tag: ["a", "b"], limit: 10, offset: 0 },
  });
  assertEquals(queryOf(calls[0].url).status, "draft");
  assertEquals(queryAllOf(calls[0].url, "tag"), ["a", "b"]);
  assertEquals(queryOf(calls[0].url).limit, "10");
  assertEquals(queryOf(calls[0].url).offset, "0");
});

Deno.test("TypefullyClient: a JSON body is sent with content-type application/json", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 1 } }]);
  await new TypefullyClient(ctx).json("/social-sets/1/tags", {
    method: "POST",
    body: { name: "Marketing" },
  });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, JSON.stringify({ name: "Marketing" }));
});

Deno.test("TypefullyClient.status: returns the status and does not attempt to parse a 204 body", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  const status = await new TypefullyClient(ctx).status("/social-sets/1/drafts/9", {
    method: "DELETE",
  });
  assertEquals(status, 204);
});

Deno.test("TypefullyClient: a non-ok response throws with the formatted error message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error: { code: "NOT_FOUND", message: "Resource not found." } },
  }]);
  await assertRejects(
    () => new TypefullyClient(ctx).json("/social-sets/1/drafts/999"),
    Error,
    "NOT_FOUND",
  );
});
