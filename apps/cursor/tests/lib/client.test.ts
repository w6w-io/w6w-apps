import { assertEquals } from "@std/assert";
import { CursorClient, formatCursorError, toList } from "../../lib/client.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

// --- formatCursorError: the three documented shapes -------------------------

Deno.test("formatCursorError: general shape {error, message}", () => {
  const msg = formatCursorError(
    401,
    "GET",
    "/teams/members",
    JSON.stringify({ error: "Unauthorized", message: "Invalid API key" }),
  );
  assertEquals(msg, "Cursor 401 Unauthorized for GET /teams/members: Invalid API key");
});

Deno.test("formatCursorError: remove-member shape — the message IS the error field", () => {
  const msg = formatCursorError(
    400,
    "POST",
    "/teams/remove-member",
    JSON.stringify({ error: "User is not a member of this team" }),
  );
  assertEquals(msg, "Cursor 400 for POST /teams/remove-member: User is not a member of this team");
});

Deno.test("formatCursorError: model-access / rate-limit shape {code, message}", () => {
  const msg = formatCursorError(
    429,
    "GET",
    "/teams/model-access/providers",
    JSON.stringify({ code: "error", message: "Rate limit exceeded" }),
  );
  assertEquals(
    msg,
    "Cursor 429 error for GET /teams/model-access/providers: Rate limit exceeded — rate " +
      "limited; back off (Retry-After header names the wait, in seconds)",
  );
});

Deno.test("formatCursorError: falls back to the raw body when it isn't JSON", () => {
  const msg = formatCursorError(500, "GET", "/teams/members", "<html>oops</html>");
  assertEquals(msg, "Cursor 500 for GET /teams/members: <html>oops</html>");
});

// --- toList -------------------------------------------------------------

Deno.test("toList: splits a comma-separated string and trims", () => {
  assertEquals(toList("a, b ,c"), ["a", "b", "c"]);
});

Deno.test("toList: passes an array through, dropping blanks", () => {
  assertEquals(toList(["a", "", "b"]), ["a", "b"]);
});

Deno.test("toList: undefined/empty input yields undefined", () => {
  assertEquals(toList(undefined), undefined);
  assertEquals(toList(""), undefined);
  assertEquals(toList([]), undefined);
});

// --- CursorClient ---------------------------------------------------------

Deno.test("CursorClient: GET builds the full URL with query params, dropping unset ones", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  await new CursorClient(ctx).get("/teams/groups", {
    billingCycle: "2025-01-15",
    empty: undefined,
  });
  assertEquals(calls[0].url, "https://api.cursor.com/teams/groups?billingCycle=2025-01-15");
  assertEquals(pathOf(calls[0].url), "/teams/groups");
});

Deno.test("CursorClient: POST sends a JSON body with the right content-type", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  await new CursorClient(ctx).post("/teams/spend", { page: 1 });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, JSON.stringify({ page: 1 }));
});

Deno.test("CursorClient: a 204 response resolves to undefined, not a parse error", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  const out = await new CursorClient(ctx).delete("/teams/groups/group_abc");
  assertEquals(out, undefined);
});

Deno.test("CursorClient: a non-2xx status throws a formatted error, not a raw fetch Response", async () => {
  const { ctx } = mockCtx([
    { status: 403, body: { error: "Forbidden", message: "Enterprise access required" } },
  ]);
  let threw: unknown;
  try {
    await new CursorClient(ctx).get("/teams/groups");
  } catch (err) {
    threw = err;
  }
  assertEquals(threw instanceof Error, true);
  assertEquals(
    (threw as Error).message,
    "Cursor 403 Forbidden for GET /teams/groups: Enterprise access required",
  );
});
