import { assertEquals } from "@std/assert";
import { compact, flag, formatChatworkError } from "../../lib/client.ts";

Deno.test("compact: drops undefined, null and empty string but keeps false and 0", () => {
  const out = compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" });
  assertEquals(out, { d: "0", e: "0", f: "x" });
});

Deno.test("flag: true -> '1', false/undefined -> undefined", () => {
  assertEquals(flag(true), "1");
  assertEquals(flag(false), undefined);
  assertEquals(flag(undefined), undefined);
});

Deno.test("formatChatworkError: surfaces the vendor's own errors array", () => {
  const msg = formatChatworkError(
    400,
    "POST",
    "/rooms/1/messages",
    JSON.stringify({
      errors: ["Parameter 'body' is required"],
    }),
  );
  assertEquals(msg, "Chatwork 400 for POST /rooms/1/messages: Parameter 'body' is required");
});

Deno.test("formatChatworkError: falls back to the raw body when it isn't the errors shape", () => {
  const msg = formatChatworkError(500, "GET", "/me", "<html>oops</html>");
  assertEquals(msg, "Chatwork 500 for GET /me: <html>oops</html>");
});

Deno.test("formatChatworkError: 429 mentions the rate-limit reset header", () => {
  const msg = formatChatworkError(
    429,
    "GET",
    "/rooms",
    JSON.stringify({
      errors: ["Rate limit exceeded"],
    }),
  );
  assertEquals(
    msg,
    "Chatwork 429 for GET /rooms: Rate limit exceeded — Chatwork rate-limits per token; retry " +
      "after X-RateLimit-Reset",
  );
});
