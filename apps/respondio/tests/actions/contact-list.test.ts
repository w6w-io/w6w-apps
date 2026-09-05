import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import contactList, { coerceFilterValue } from "../../actions/contact-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("contact-list: POSTs the filter body with pagination as query params", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: 1 }]) }]);
  const out = await contactList.execute(
    { search: "ada", timezone: "UTC", limit: 50, cursorId: 0 },
    ctx,
  ) as { items: unknown[] };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/contact/list");
  assertEquals(queryOf(calls[0].url), { limit: "50", cursorId: "0" });
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.search, "ada");
  assertEquals(body.timezone, "UTC");
  assertEquals(body.filter, { $and: [] });
  assertEquals(out.items.length, 1);
});

Deno.test("contact-list: matchType 'or' produces an $or combinator", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await contactList.execute({ matchType: "or", timezone: "UTC" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(Object.keys(body.filter), ["$or"]);
});

Deno.test("contact-list: a condition is mapped into the filter with its coerced value", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await contactList.execute(
    {
      timezone: "UTC",
      conditions: [
        { category: "contactField", field: "assigneeUserId", operator: "isEqualTo", value: "123" },
      ],
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.filter.$and, [
    { category: "contactField", field: "assigneeUserId", operator: "isEqualTo", value: "123" },
  ]);
});

Deno.test("coerceFilterValue: splits a comma list for the 'has ... of' operators", () => {
  assertEquals(coerceFilterValue("hasAnyOf", "a, b ,c"), ["a", "b", "c"]);
  assertEquals(coerceFilterValue("hasAllOf", "x"), ["x"]);
  assertEquals(coerceFilterValue("hasNoneOf", "x,y"), ["x", "y"]);
});

Deno.test("coerceFilterValue: splits 'from,to' for the between operators", () => {
  assertEquals(coerceFilterValue("isBetween", "1,10"), { from: "1", to: "10" });
  assertEquals(coerceFilterValue("isTimestampBetween", "2026-01-01,2026-02-01"), {
    from: "2026-01-01",
    to: "2026-02-01",
  });
});

Deno.test("coerceFilterValue: a between operator without exactly two parts throws", () => {
  assertThrows(() => coerceFilterValue("isBetween", "1"), Error, 'shaped "from,to"');
});

Deno.test("coerceFilterValue: drops the value entirely for exists/doesNotExist", () => {
  assertEquals(coerceFilterValue("exists", "anything"), null);
  assertEquals(coerceFilterValue("doesNotExist", undefined), null);
});

Deno.test("coerceFilterValue: passes an ordinary value through unchanged", () => {
  assertEquals(coerceFilterValue("isEqualTo", "123"), "123");
  assertEquals(coerceFilterValue("isEqualTo", undefined), undefined);
});

Deno.test("contact-list: is a search action", () => {
  assertEquals(contactList.type, "search");
});

Deno.test("contact-list: no unexpected extra request is made", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await contactList.execute({ timezone: "UTC" }, ctx);
  assertEquals(calls.length, 1);
  await assertRejects(async () => {
    // A second call with an empty queue should throw from the mock, proving
    // the action itself makes exactly one request per invocation.
    const { ctx: ctx2 } = mockCtx([]);
    await contactList.execute({ timezone: "UTC" }, ctx2);
  });
});
