import { assert, assertEquals, assertThrows } from "@std/assert";
import { asJson, asOptionalJson, toList } from "../../lib/params.ts";

Deno.test("toList: passes an array through, trimmed and filtered", () => {
  assertEquals(toList([" a ", "", "b"]), ["a", "b"]);
});

Deno.test("toList: splits a comma-joined string", () => {
  assertEquals(toList("a, b ,c"), ["a", "b", "c"]);
});

Deno.test("toList: undefined/null/empty all become undefined", () => {
  assertEquals(toList(undefined), undefined);
  assertEquals(toList(null), undefined);
  assertEquals(toList(""), undefined);
});

Deno.test("asOptionalJson: parses a JSON string", () => {
  assertEquals(asOptionalJson<{ a: number }>('{"a":1}', "x"), { a: 1 });
});

Deno.test("asOptionalJson: passes a non-string value through unchanged", () => {
  const value = { a: 1 };
  assertEquals(asOptionalJson(value, "x"), value);
});

Deno.test("asOptionalJson: undefined/null/empty all become undefined", () => {
  assertEquals(asOptionalJson(undefined, "x"), undefined);
  assertEquals(asOptionalJson(null, "x"), undefined);
  assertEquals(asOptionalJson("", "x"), undefined);
});

Deno.test("asOptionalJson: throws a labelled error on invalid JSON", () => {
  assertThrows(() => asOptionalJson("{not json", "replyTo"), Error, "replyTo is not valid JSON");
});

Deno.test("asJson: throws when the value is absent", () => {
  const err = assertThrows(() => asJson(undefined, "contacts"), Error);
  assert(/contacts is required/.test(err.message));
});

Deno.test("asJson: returns the parsed value when present", () => {
  assertEquals(asJson('[{"phone":"+1"}]', "contacts"), [{ phone: "+1" }]);
});
