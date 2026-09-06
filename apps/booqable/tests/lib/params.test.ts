import { assertEquals, assertThrows } from "@std/assert";
import { asOptionalJson, flattenFilter, pageQuery } from "../../lib/params.ts";

Deno.test("flattenFilter: flattens { attr: { op: value } } to filter[attr][op]", () => {
  assertEquals(
    flattenFilter({ starts_at: { gte: "1980-11-16T09:00:00+00:00" } }),
    { "filter[starts_at][gte]": "1980-11-16T09:00:00+00:00" },
  );
});

Deno.test("flattenFilter: shorthand { attr: value } becomes filter[attr]", () => {
  assertEquals(flattenFilter({ archived: false }), { "filter[archived]": "false" });
});

Deno.test("flattenFilter: drops null/undefined leaves and handles no filter", () => {
  assertEquals(flattenFilter({ name: { eq: null } }), {});
  assertEquals(flattenFilter(undefined), {});
});

Deno.test("pageQuery: maps to page[number]/page[size]", () => {
  assertEquals(
    pageQuery({ pageNumber: 2, pageSize: 25 }),
    { "page[number]": 2, "page[size]": 25 },
  );
});

Deno.test("asOptionalJson: parses a JSON string param", () => {
  assertEquals(asOptionalJson<{ a: number }>('{"a":1}', "filter"), { a: 1 });
});

Deno.test("asOptionalJson: passes through an already-parsed value", () => {
  assertEquals(asOptionalJson<{ a: number }>({ a: 1 }, "filter"), { a: 1 });
});

Deno.test("asOptionalJson: returns undefined for blank input", () => {
  assertEquals(asOptionalJson(undefined, "filter"), undefined);
  assertEquals(asOptionalJson("", "filter"), undefined);
});

Deno.test("asOptionalJson: throws a labeled error for invalid JSON", () => {
  assertThrows(() => asOptionalJson("{not json", "filter"), Error, "filter is not valid JSON");
});
