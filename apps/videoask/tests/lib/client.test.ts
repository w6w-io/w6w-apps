import { assertEquals, assertRejects } from "@std/assert";
import {
  compact,
  encodeId,
  formatVideoAskError,
  toList,
  VideoAskClient,
} from "../../lib/client.ts";
import { detailError, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("compact: drops undefined, null and empty string but keeps false and 0", () => {
  assertEquals(
    compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "kept" }),
    { d: false, e: 0, f: "kept" },
  );
});

Deno.test("toList: normalises an array or a comma-separated string, drops blanks", () => {
  assertEquals(toList(["a", "b"]), ["a", "b"]);
  assertEquals(toList("a, b ,c"), ["a", "b", "c"]);
  assertEquals(toList(""), undefined);
  assertEquals(toList(undefined), undefined);
  assertEquals(toList("  ,  "), undefined);
});

Deno.test("encodeId: escapes a slash so a resource id cannot smuggle a path segment", () => {
  assertEquals(encodeId("abc/../../secret"), "abc%2F..%2F..%2Fsecret");
  assertEquals(encodeId("  abc-123  "), "abc-123");
});

Deno.test("formatVideoAskError: surfaces a `detail` string", () => {
  const msg = formatVideoAskError(
    401,
    "GET",
    "/forms",
    JSON.stringify(detailError("Authentication credentials were not provided.")),
  );
  assertEquals(
    msg,
    "VideoAsk 401 for GET /forms: Authentication credentials were not provided.",
  );
});

Deno.test("formatVideoAskError: surfaces a DRF field-keyed validation body", () => {
  const msg = formatVideoAskError(
    400,
    "POST",
    "/tags",
    JSON.stringify({ title: ["This field is required."] }),
  );
  assertEquals(msg, "VideoAsk 400 for POST /tags: title: This field is required.");
});

Deno.test("formatVideoAskError: falls back to the raw body when not JSON", () => {
  const msg = formatVideoAskError(500, "GET", "/forms", "<html>oops</html>");
  assertEquals(msg, "VideoAsk 500 for GET /forms: <html>oops</html>");
});

Deno.test("VideoAskClient.entity: un-enveloped GET, no organization-id header by default", async () => {
  const { ctx, calls } = mockCtx([{ body: { user_id: "u1" } }]);
  const result = await new VideoAskClient(ctx).entity("/me");
  assertEquals(result, { user_id: "u1" });
  assertEquals(calls[0].url, "https://api.videoask.com/me");
  assertEquals("organization-id" in calls[0].headers, false);
});

Deno.test("VideoAskClient: sends organization-id only when provided", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new VideoAskClient(ctx).entity("/forms/f1", { organizationId: "org-1" });
  assertEquals(calls[0].headers["organization-id"], "org-1");
});

Deno.test("VideoAskClient.list: unwraps the {results, next, previous, count} envelope", async () => {
  const { ctx } = mockCtx([
    { body: { count: 2, next: null, previous: null, results: [{ id: "1" }, { id: "2" }] } },
  ]);
  const result = await new VideoAskClient(ctx).list("/forms");
  assertEquals(result.count, 2);
  assertEquals(result.results.length, 2);
});

Deno.test("VideoAskClient.array: returns a bare array unchanged", async () => {
  const { ctx } = mockCtx([{ body: [{ answer_id: "a1" }] }]);
  const answers = await new VideoAskClient(ctx).array("/questions/q1/answers");
  assertEquals(answers, [{ answer_id: "a1" }]);
});

Deno.test("VideoAskClient.status: returns the HTTP status for a 204 delete", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  const status = await new VideoAskClient(ctx).status("/tags/t1", { method: "DELETE" });
  assertEquals(status, 204);
});

Deno.test("VideoAskClient: query values that are undefined/null/empty are omitted", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new VideoAskClient(ctx).list("/forms", {
    query: { limit: 20, offset: undefined, title: "" },
  });
  const q = queryOf(calls[0].url);
  assertEquals(q.limit, "20");
  assertEquals("offset" in q, false);
  assertEquals("title" in q, false);
});

Deno.test("VideoAskClient: a boolean query value is sent as the literal string", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await new VideoAskClient(ctx).status("/forms/f1", {
    method: "DELETE",
    query: { soft_delete: true },
  });
  assertEquals(queryOf(calls[0].url).soft_delete, "true");
  assertEquals(pathOf(calls[0].url), "/forms/f1");
});

Deno.test("VideoAskClient: a non-ok response throws with the formatted VideoAsk error", async () => {
  const { ctx } = mockCtx([{ status: 401, body: detailError("Error decoding token.") }]);
  await assertRejects(
    () => new VideoAskClient(ctx).entity("/me"),
    Error,
    "VideoAsk 401 for GET /me: Error decoding token.",
  );
});

Deno.test("VideoAskClient: a JSON body sets content-type and is serialized", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { ok: true } }]);
  await new VideoAskClient(ctx).entity("/tags", { method: "POST", body: { title: "x" } });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, JSON.stringify({ title: "x" }));
});
