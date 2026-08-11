import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  asJson,
  asOptionalJson,
  consentToTrackParam,
  orderDirectionParam,
  pagedOutput,
  pageParams,
  toStringList,
} from "../../lib/params.ts";

Deno.test("params: pageParams prefills a small size, not the vendor's 1000 maximum", () => {
  const [page, size] = pageParams(100);
  assertEquals(page.key, "page");
  assertEquals(page.default, 1, "the API is 1-indexed");
  assertEquals(size.default, 100);
  // The floor is real: pagesize below 10 is code 801.
  assertEquals(size.validation?.min, 10);
  assertEquals(size.validation?.max, 1000);
  assert(size.hint!.includes("1000"), "the hint must say what the vendor's own default is");
});

Deno.test("params: orderDirection offers exactly asc and desc, which is all code 803 allows", () => {
  const values = (orderDirectionParam.options as Array<{ value: string }>).map((o) => o.value);
  assertEquals(values, ["asc", "desc"]);
});

/**
 * ConsentToTrack is genuinely required — omitting it is code 214 — and its value
 * spans the whole client, not one list.
 */
Deno.test("params: consentToTrack is required and offers the three documented values", () => {
  assertEquals(consentToTrackParam.required, true);
  assertEquals(consentToTrackParam.default, "Unchanged");
  const values = (consentToTrackParam.options as Array<{ value: string }>).map((o) => o.value);
  assertEquals(values, ["Yes", "No", "Unchanged"]);
  assert(consentToTrackParam.hint!.includes("214"), "the hint must name the code for omitting it");
});

Deno.test("params: pagedOutput declares the envelope every paged endpoint returns", () => {
  const keys = pagedOutput.map((f) => f.key);
  assertEquals(keys, [
    "Results",
    "PageNumber",
    "PageSize",
    "RecordsOnThisPage",
    "TotalNumberOfRecords",
    "NumberOfPages",
  ]);
});

// --- json params ------------------------------------------------------------

Deno.test("params: a json param is accepted both parsed and as a typed string", () => {
  assertEquals(asOptionalJson<string[]>(["a"], "x"), ["a"]);
  assertEquals(asOptionalJson<string[]>('["a"]', "x"), ["a"]);
  assertEquals(asOptionalJson<unknown>(undefined, "x"), undefined);
  assertEquals(asOptionalJson<unknown>(null, "x"), undefined);
  assertEquals(asOptionalJson<unknown>("", "x"), undefined);
});

Deno.test("params: malformed JSON names the field rather than throwing a syntax error", () => {
  const err = assertThrows(() => asOptionalJson("{not json", "Custom fields"), Error);
  assert(err.message.includes("Custom fields"), err.message);
  assert(err.message.includes("not valid JSON"), err.message);
});

Deno.test("params: asJson treats absence as an error and names the field", () => {
  assertEquals(asJson<string[]>('["a"]', "x"), ["a"]);
  const err = assertThrows(() => asJson(undefined, "Subscribers"), Error);
  assert(err.message.includes("Subscribers is required"), err.message);
});

// --- recipient lists --------------------------------------------------------

Deno.test("params: toStringList splits and trims a comma-separated string", () => {
  assertEquals(toStringList("a@b.com, c@d.com"), ["a@b.com", "c@d.com"]);
  // A display-name form must survive intact; the comma inside angle brackets is
  // not something this API's own examples produce.
  assertEquals(toStringList("Joe Smith <joe@example.com>"), ["Joe Smith <joe@example.com>"]);
});

Deno.test("params: toStringList accepts an array unchanged and drops empties", () => {
  assertEquals(toStringList(["a@b.com", " ", "c@d.com"]), ["a@b.com", "c@d.com"]);
  assertEquals(toStringList("a@b.com,,"), ["a@b.com"]);
});

Deno.test("params: toStringList reports nothing as undefined, not as an empty array", () => {
  assertEquals(toStringList(undefined), undefined);
  assertEquals(toStringList(null), undefined);
  assertEquals(toStringList(""), undefined);
  assertEquals(toStringList([]), undefined);
  assertEquals(toStringList(" , "), undefined);
});
