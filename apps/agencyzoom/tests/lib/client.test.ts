import { assert, assertEquals, assertThrows } from "@std/assert";
import { asJson, compact, formatAgencyZoomError } from "../../lib/client.ts";

Deno.test("compact: drops undefined/null/empty-string, keeps false and 0", () => {
  assertEquals(
    compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }),
    { d: false, e: 0, f: "x" },
  );
});

Deno.test("formatAgencyZoomError: the documented {error, fieldErrors} shape", () => {
  const msg = formatAgencyZoomError(
    400,
    "POST",
    "/v1/api/leads/create",
    JSON.stringify({
      error: "Invalid request",
      fieldErrors: [{ field: "email", error: "required" }],
    }),
  );
  assert(msg.includes("Invalid request"), msg);
  assert(msg.includes("email: required"), msg);
});

/**
 * The undocumented shape a live 401 actually carries — see lib/client.ts. This
 * pins the fallback so a reader who only knows the OpenAPI document's own
 * ErrorResponse schema does not "fix" this branch away.
 */
Deno.test("formatAgencyZoomError: the undocumented {name, message, code, status} shape", () => {
  const msg = formatAgencyZoomError(
    401,
    "GET",
    "/v1/api/employees",
    JSON.stringify({
      name: "Unauthorized",
      message: "Your request was made with invalid credentials.",
      code: 0,
      status: 401,
    }),
  );
  assert(msg.includes("Unauthorized"), msg);
  assert(msg.includes("Your request was made with invalid credentials."), msg);
});

Deno.test("formatAgencyZoomError: falls back to the raw body when neither shape matches", () => {
  const msg = formatAgencyZoomError(500, "GET", "/v1/api/tasks/1", "upstream exploded");
  assert(msg.includes("upstream exploded"), msg);
});

Deno.test("asJson: parses a JSON string param", () => {
  assertEquals(asJson<{ a: number }>('{"a":1}', "field"), { a: 1 });
});

Deno.test("asJson: passes a pre-parsed value through", () => {
  assertEquals(asJson<{ a: number }>({ a: 1 }, "field"), { a: 1 });
});

Deno.test("asJson: rejects invalid JSON and missing values", () => {
  assertThrows(() => asJson("{not json", "field"), Error, "not valid JSON");
  assertThrows(() => asJson(undefined, "field"), Error, "is required");
});
