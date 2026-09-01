import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/data-list.ts";

const display = { baseUrl: "https://myapp.bubbleapps.io/version-test" };

Deno.test("data-list: builds the query string from limit/cursor/sort/constraints", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: { response: { results: [{ _id: "1" }], cursor: 0, count: 1, remaining: 0 } },
    },
  ], { display });

  const out = await action.execute({
    type: "Rental Unit",
    limit: 3,
    cursor: 2,
    sortField: "unitname",
    descending: true,
    constraints: '[{"key":"unitnumber","constraint_type":"greater than","value":"3"}]',
  }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/version-test/api/1.1/obj/rentalunit");
  assertEquals(url.searchParams.get("limit"), "3");
  assertEquals(url.searchParams.get("cursor"), "2");
  assertEquals(url.searchParams.get("sort_field"), "unitname");
  assertEquals(url.searchParams.get("descending"), "true");
  assertEquals(
    url.searchParams.get("constraints"),
    '[{"key":"unitnumber","constraint_type":"greater than","value":"3"}]',
  );
  assertEquals(out.results, [{ _id: "1" }]);
});

Deno.test("data-list: the type name is lowercased and stripped of spaces", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { response: { results: [], cursor: 0, count: 0, remaining: 0 } } },
  ], { display });
  await action.execute({ type: "Sports Team" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/version-test/api/1.1/obj/sportsteam");
});

Deno.test("data-list: descending is only sent when a sort field is given", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { response: { results: [], cursor: 0, count: 0, remaining: 0 } } },
  ], { display });
  await action.execute({ type: "thing", descending: true }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.has("descending"), false);
});

Deno.test("data-list: rejects constraints that are not a JSON array", async () => {
  const { ctx } = mockCtx([], { display });
  await assertRejects(async () => {
    await action.execute({ type: "thing", constraints: '{"not":"array"}' }, ctx);
  });
});

Deno.test('data-list: exclude_remaining is sent as the string "true"', async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { response: { results: [], cursor: 0, count: 0, remaining: 0 } } },
  ], { display });
  await action.execute({ type: "thing", excludeRemaining: true }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("exclude_remaining"), "true");
});
