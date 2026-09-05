import { assertEquals, assertThrows } from "@std/assert";
import {
  companyIdFromConnection,
  formatRecruiteeError,
  toList,
  toNumberList,
} from "../../lib/client.ts";

Deno.test("companyIdFromConnection: reads display.companyId", () => {
  assertEquals(
    companyIdFromConnection({ display: { companyId: "123" } } as never),
    "123",
  );
  assertEquals(
    companyIdFromConnection({ display: { companyId: 123 } } as never),
    "123",
  );
});

Deno.test("companyIdFromConnection: throws a clear message when absent", () => {
  assertThrows(
    () => companyIdFromConnection(undefined),
    Error,
    "reconnect the account",
  );
  assertThrows(
    () => companyIdFromConnection({ display: {} } as never),
    Error,
    "reconnect the account",
  );
});

Deno.test("formatRecruiteeError: handles the bare-string `error` shape", () => {
  const msg = formatRecruiteeError(
    401,
    "GET",
    "/candidates",
    JSON.stringify({ error: "Token not found.", error_code: "invalid_token" }),
  );
  assertEquals(msg.includes("401"), true);
  assertEquals(msg.includes("invalid_token"), true);
  assertEquals(msg.includes("Token not found."), true);
});

Deno.test("formatRecruiteeError: handles the array-of-strings `error` shape plus error_fields", () => {
  const msg = formatRecruiteeError(
    422,
    "POST",
    "/candidates",
    JSON.stringify({
      error: ["Name can't be blank"],
      error_fields: { name: ["can't be blank"] },
    }),
  );
  assertEquals(msg.includes("Name can't be blank"), true);
  assertEquals(msg.includes("name can't be blank"), true);
});

Deno.test("formatRecruiteeError: falls back to the raw body when it isn't JSON", () => {
  const msg = formatRecruiteeError(500, "GET", "/candidates", "<html>oops</html>");
  assertEquals(msg.includes("500"), true);
  assertEquals(msg.includes("<html>oops</html>"), true);
});

Deno.test("toList: splits a comma string, passes through an array, drops blanks", () => {
  assertEquals(toList("a, b ,c"), ["a", "b", "c"]);
  assertEquals(toList(["a", "b"]), ["a", "b"]);
  assertEquals(toList(""), undefined);
  assertEquals(toList(undefined), undefined);
});

Deno.test("toNumberList: accepts a number array, a string array, or a comma string", () => {
  assertEquals(toNumberList([1, 2, 3]), [1, 2, 3]);
  assertEquals(toNumberList(["1", "2"]), [1, 2]);
  assertEquals(toNumberList("1,2,3"), [1, 2, 3]);
  assertEquals(toNumberList(undefined), undefined);
});
