import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  asOptionalJson,
  encodeEmailContent,
  looksBase64,
  pageParams,
  reminderMinuteOptions,
  toBase64,
  toIdList,
} from "../../lib/params.ts";

Deno.test("pageParams prefills a small page, because Keap documents no default", () => {
  const [size, token] = pageParams();
  assertEquals(size.key, "pageSize");
  assertEquals(size.default, 50);
  assertEquals(token.key, "pageToken");
  assertEquals(pageParams(5)[0].default, 5);
});

Deno.test("toIdList accepts a comma string or an array and drops the blanks", () => {
  assertEquals(toIdList("1, 2 ,3"), ["1", "2", "3"]);
  assertEquals(toIdList(["1", "", "2"]), ["1", "2"]);
  assertEquals(toIdList(undefined), []);
  assertEquals(toIdList(""), []);
});

Deno.test("toIdList stringifies numbers, because Keap's bulk endpoints want strings", () => {
  assertEquals(toIdList([1, 2]), ["1", "2"]);
});

Deno.test("asOptionalJson accepts both the parsed and the typed form", () => {
  assertEquals(asOptionalJson<{ a: number }>('{"a":1}', "X"), { a: 1 });
  assertEquals(asOptionalJson<{ a: number }>({ a: 1 }, "X"), { a: 1 });
  assertEquals(asOptionalJson("", "X"), undefined);
  assertEquals(asOptionalJson(undefined, "X"), undefined);
});

Deno.test("asOptionalJson names the field it could not parse", () => {
  assertThrows(() => asOptionalJson("{not json", "Custom fields"), Error, "Custom fields");
});

// --- base64, which the email endpoint requires and does not enforce ----------

Deno.test("toBase64 matches the vendor's own worked example", () => {
  // Keap's `html_content` example is `PGgxPldlbGNvbWU8L2gxPg==` for
  // `<h1>Welcome</h1>`.
  assertEquals(toBase64("<h1>Welcome</h1>"), "PGgxPldlbGNvbWU8L2gxPg==");
});

Deno.test("toBase64 survives a non-Latin1 character, where bare btoa throws", () => {
  const encoded = toBase64("Café ☕");
  assertEquals(encoded, "Q2Fmw6kg4piV");
  // Round-trips back through UTF-8.
  const bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
  assertEquals(new TextDecoder().decode(bytes), "Café ☕");
  assertThrows(() => btoa("Café ☕"));
});

Deno.test("looksBase64 accepts real base64 and rejects text that merely looks like it", () => {
  assert(looksBase64("PGgxPldlbGNvbWU8L2gxPg=="));
  // Correct alphabet and length, but not a canonical encoding of anything.
  assert(!looksBase64("<h1>Welcome</h1>"));
  assert(!looksBase64("Hello"));
  assert(!looksBase64(""));
});

Deno.test("encodeEmailContent encodes plain text and leaves encoded text alone", () => {
  assertEquals(encodeEmailContent("<h1>Welcome</h1>"), "PGgxPldlbGNvbWU8L2gxPg==");
  // Already encoded: encoding twice would send the recipient base64 as the body.
  assertEquals(encodeEmailContent("PGgxPldlbGNvbWU8L2gxPg=="), "PGgxPldlbGNvbWU8L2gxPg==");
  assertEquals(encodeEmailContent(""), undefined);
  assertEquals(encodeEmailContent(undefined), undefined);
});

Deno.test("reminderMinuteOptions is exactly the closed set Keap accepts", () => {
  assertEquals(
    reminderMinuteOptions.map((o) => o.value),
    [5, 10, 15, 30, 60, 120, 240, 480, 1440, 2880],
  );
  // Numbers, not the strings Keap's own enum mistypes them as.
  for (const option of reminderMinuteOptions) assertEquals(typeof option.value, "number");
});
