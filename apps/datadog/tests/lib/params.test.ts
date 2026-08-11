import { assertEquals, assertThrows } from "@std/assert";
import { asInteger, normalizeMetricPoints } from "../../lib/params.ts";

const NOW = 1_700_000_000;

Deno.test("points: a bare number becomes one point at the supplied time", () => {
  assertEquals(normalizeMetricPoints(42, NOW), [{ timestamp: NOW, value: 42 }]);
});

Deno.test("points: one object is accepted, and an explicit timestamp is kept", () => {
  assertEquals(
    normalizeMetricPoints({ timestamp: 1_699_999_000, value: 7 }, NOW),
    [{ timestamp: 1_699_999_000, value: 7 }],
  );
});

Deno.test("points: an array is passed through, defaulting only the missing timestamps", () => {
  assertEquals(
    normalizeMetricPoints([{ value: 1 }, { timestamp: 5, value: 2 }, 3], NOW),
    [
      { timestamp: NOW, value: 1 },
      { timestamp: 5, value: 2 },
      { timestamp: NOW, value: 3 },
    ],
  );
});

/**
 * The default is **seconds**, and the whole reason this function exists.
 * `Date.now()` is milliseconds; a point stamped with it lands roughly 55,000
 * years in the future, where Datadog answers 202 and drops it silently.
 */
Deno.test("points: the default timestamp is in seconds, not milliseconds", () => {
  const [point] = normalizeMetricPoints(1, NOW);
  assertEquals(point.timestamp, NOW);
  assertEquals(String(point.timestamp).length, 10, "the default timestamp is not second-precision");
});

Deno.test("points: numeric strings are accepted, because forms produce them", () => {
  assertEquals(
    normalizeMetricPoints({ timestamp: "1699999000", value: "7.5" }, NOW),
    [{ timestamp: 1_699_999_000, value: 7.5 }],
  );
});

Deno.test("points: a non-numeric value is rejected rather than sent as NaN", () => {
  assertThrows(() => normalizeMetricPoints({ value: "abc" }, NOW), Error, "finite numeric");
  assertThrows(() => normalizeMetricPoints(Number.NaN, NOW), Error, "finite number");
  assertThrows(() => normalizeMetricPoints({ value: 1, timestamp: "soon" }, NOW), Error, "POSIX");
});

Deno.test("points: a shapeless entry and an empty list are both refused", () => {
  assertThrows(() => normalizeMetricPoints("hello", NOW), Error, "Points must be");
  assertThrows(() => normalizeMetricPoints([[1, 2]], NOW), Error, "Points must be");
  assertThrows(() => normalizeMetricPoints([], NOW), Error, "at least one point");
});

Deno.test("asInteger: accepts an integer or its string form and rejects the rest", () => {
  assertEquals(asInteger(42, "Monitor ID"), 42);
  assertEquals(asInteger(" 42 ", "Monitor ID"), 42);
  assertThrows(() => asInteger("12.5", "Monitor ID"), Error, "whole number");
  assertThrows(() => asInteger("abc", "Monitor ID"), Error, "whole number");
  assertThrows(() => asInteger(undefined, "Monitor ID"), Error, "whole number");
});
