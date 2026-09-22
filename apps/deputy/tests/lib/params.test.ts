import { assertEquals } from "@std/assert";
import { buildQueryBody, pageSize, searchPage } from "../../lib/params.ts";
import { MAX_PAGE_SIZE } from "../../lib/client.ts";

Deno.test("pageSize: defaults to 100 when nothing is given", () => {
  assertEquals(pageSize(undefined), 100);
});

Deno.test("pageSize: clamps to the documented 1..500 range", () => {
  assertEquals(pageSize(0), 1);
  assertEquals(pageSize(-5), 1);
  assertEquals(pageSize(9999), MAX_PAGE_SIZE);
  assertEquals(pageSize(250), 250);
});

Deno.test("pageSize: floors a fractional value and ignores non-numeric input", () => {
  assertEquals(pageSize(50.9), 50);
  assertEquals(pageSize("not a number"), 100);
});

Deno.test("buildQueryBody: always includes start and max", () => {
  assertEquals(buildQueryBody({}), { start: 0, max: 100 });
});

Deno.test("buildQueryBody: parses a JSON-string search and sort", () => {
  const body = buildQueryBody({
    search: '{"s1":{"field":"Active","data":true,"type":"eq"}}',
    sort: '{"StartTime":"desc"}',
  });
  assertEquals(body.search, { s1: { field: "Active", data: true, type: "eq" } });
  assertEquals(body.sort, { StartTime: "desc" });
});

Deno.test("buildQueryBody: splits a comma-separated join into an array", () => {
  const body = buildQueryBody({ join: "EmployeeObject, CompanyObject" });
  assertEquals(body.join, ["EmployeeObject", "CompanyObject"]);
});

Deno.test("buildQueryBody: carries the cursor forward as start", () => {
  assertEquals(buildQueryBody({ cursor: 200 }).start, 200);
});

Deno.test("buildQueryBody: ignores a negative cursor", () => {
  assertEquals(buildQueryBody({ cursor: -10 }).start, 0);
});

Deno.test("searchPage: offers nextCursor when the page came back exactly full", () => {
  const items = Array.from({ length: 100 }, (_, i) => ({ Id: i }));
  const page = searchPage(items, { max: 100 });
  assertEquals(page.count, 100);
  assertEquals(page.start, 0);
  assertEquals(page.max, 100);
  assertEquals(page.nextCursor, 100);
});

Deno.test("searchPage: omits nextCursor when the page is short (end of table)", () => {
  const items = Array.from({ length: 3 }, (_, i) => ({ Id: i }));
  const page = searchPage(items, { max: 100 });
  assertEquals(page.count, 3);
  assertEquals(page.nextCursor, undefined);
});

Deno.test("searchPage: nextCursor accounts for the starting offset", () => {
  const items = Array.from({ length: 50 }, (_, i) => ({ Id: i }));
  const page = searchPage(items, { max: 50, cursor: 100 });
  assertEquals(page.start, 100);
  assertEquals(page.nextCursor, 150);
});
