import { assert, assertEquals } from "@std/assert";
import {
  callDirectionOptions,
  dispatchingStrategyOptions,
  e164Param,
  listResult,
  orderOptions,
  paginationParams,
  paginationQuery,
  windowParams,
  windowQuery,
} from "../../lib/params.ts";

/**
 * The Pagination section is explicit: "Default is 20. Minimum is 1, maximum is
 * 50." A form that lets someone ask for 100 produces a request Aircall does not
 * honour and gives no feedback about.
 */
Deno.test("params: perPage is bounded at Aircall's documented 1..50", () => {
  const [perPage] = paginationParams();
  assertEquals(perPage.key, "perPage");
  assertEquals(perPage.default, 20);
  assertEquals(perPage.validation?.min, 1);
  assertEquals(perPage.validation?.max, 50);
  assertEquals(perPage.validation?.integer, true);
});

Deno.test("params: pagination maps to Aircall's page / per_page names", () => {
  assertEquals(paginationQuery({ page: 3, perPage: 50 }), { page: 3, per_page: 50 });
  assertEquals(paginationQuery({}), { page: undefined, per_page: undefined });
});

/**
 * `from` and `to` are UNIX seconds on every endpoint that takes them. Passing an
 * ISO string returns an empty list rather than an error, so the hint has to say
 * so or the mistake is silent.
 */
Deno.test("params: the creation window says UNIX seconds, not ISO 8601", () => {
  const [from, to, order] = windowParams("Calls");
  assertEquals(from.key, "from");
  assertEquals(to.key, "to");
  assertEquals(order.key, "order");
  assert(from.hint!.includes("UNIX timestamp in seconds"), from.hint);
  assert(from.hint!.includes("not ISO 8601"), from.hint);
  assertEquals(order.options, orderOptions);
});

Deno.test("params: the window query passes values through unchanged", () => {
  assertEquals(windowQuery({ from: "1", to: "2", order: "desc" }), {
    from: "1",
    to: "2",
    order: "desc",
  });
});

/**
 * `hasMore` follows `next_page_link`, not `count < total`. On Calls and Contacts
 * `total` can exceed the 10,000-item pagination ceiling, so the comparison
 * promises a page the API will refuse to serve.
 */
Deno.test("params: listResult derives hasMore from next_page_link only", () => {
  assertEquals(
    listResult({ count: 2, total: 2234, next_page_link: null }, [{ id: 1 }, { id: 2 }]),
    {
      items: [{ id: 1 }, { id: 2 }],
      meta: { count: 2, total: 2234, next_page_link: null },
      count: 2,
      total: 2234,
      hasMore: false,
    },
  );
  assertEquals(
    listResult({ count: 1, total: 1, next_page_link: "https://api.aircall.io/v1/calls?page=2" }, [
      { id: 1 },
    ]).hasMore,
    true,
    "a next_page_link means another page even when count equals total",
  );
});

Deno.test("params: listResult falls back to the item count when meta omits one", () => {
  const out = listResult({}, [{ id: 1 }, { id: 2 }, { id: 3 }]);
  assertEquals(out.count, 3);
  assertEquals(out.total, undefined);
  assertEquals(out.hasMore, false);
});

/**
 * Aircall requires E.164 for every number it dials or transfers to — "+" then
 * country code and digits, no spaces or punctuation.
 */
Deno.test("params: the E.164 pattern accepts real numbers and rejects formatted ones", () => {
  const param = e164Param("to", "To", true, "hint");
  const re = new RegExp(param.validation!.pattern!);
  for (const good of ["+18001231234", "+33176360695", "+441200000000"]) {
    assert(re.test(good), `rejected a valid E.164 number: ${good}`);
  }
  for (const bad of ["18001231234", "+1 800 123 1234", "+0123456789", "", "+", "+1-800-1231234"]) {
    assert(!re.test(bad), `accepted a non-E.164 number: ${bad}`);
  }
});

Deno.test("params: the vendor enums are transcribed, not invented", () => {
  assertEquals(orderOptions.map((o) => o.value), ["asc", "desc"]);
  assertEquals(callDirectionOptions.map((o) => o.value), ["inbound", "outbound"]);
  assertEquals(
    dispatchingStrategyOptions.map((o) => o.value),
    ["simultaneous", "random", "longest_idle"],
  );
});
