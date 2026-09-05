import { assertEquals } from "@std/assert";
import listMatters from "../../actions/list-matters.ts";
import { item, list, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("list-matters: hits GET /v1/prospects, the wire name for Matter", async () => {
  const { ctx, calls } = mockCtx([{
    body: list([item("25", "prospect", { first_name: "Tyrion", case_title: "Drank bad wine" })]),
  }]);
  const out = await listMatters.execute({}, ctx) as { data: unknown[] };

  assertEquals(pathOf(calls[0].url), "/v1/prospects");
  assertEquals(out.data.length, 1);
});

Deno.test("list-matters: shares the same query-param mapping as list-contacts", async () => {
  const { ctx, calls } = mockCtx([{ body: list([]) }]);
  await listMatters.execute({ filterBy: "status", filterOn: "active", filterWith: "!=" }, ctx);
  assertEquals(queryOf(calls[0].url), {
    filter_by: "status",
    filter_on: "active",
    filter_with: "!=",
  });
});
