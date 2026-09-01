import { assertEquals, assertThrows } from "@std/assert";
import { encodeFilter, listQuery } from "../../lib/params.ts";

Deno.test("listQuery: passes through the documented list params", () => {
  assertEquals(
    listQuery({
      size: 25,
      from: 10,
      sort_field: "date_updated",
      sort_direction: "asc",
      filter: { must: [{ term: { first_name: "John" } }] },
      actor: "sam@company.com",
    }),
    {
      size: 25,
      from: 10,
      sort_field: "date_updated",
      sort_direction: "asc",
      filter: '{"must":[{"term":{"first_name":"John"}}]}',
      actor: "sam@company.com",
    },
  );
});

Deno.test("listQuery: omits fields the caller left unset", () => {
  assertEquals(listQuery({}), {
    size: undefined,
    from: undefined,
    sort_field: undefined,
    sort_direction: undefined,
    filter: undefined,
    actor: undefined,
  });
});

Deno.test("encodeFilter: accepts an already-parsed object", () => {
  assertEquals(encodeFilter({ must: [] }), '{"must":[]}');
});

Deno.test("encodeFilter: accepts a JSON string a user typed", () => {
  assertEquals(encodeFilter('{"must":[]}'), '{"must":[]}');
});

Deno.test('encodeFilter: absence is absence, not the literal string "undefined"', () => {
  assertEquals(encodeFilter(undefined), undefined);
  assertEquals(encodeFilter(""), undefined);
});

Deno.test("encodeFilter: an unparsable string throws rather than sending garbage", () => {
  assertThrows(() => encodeFilter("{not json"), Error, "filter is not valid JSON");
});
