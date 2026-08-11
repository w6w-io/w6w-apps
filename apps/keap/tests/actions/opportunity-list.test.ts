import { assert, assertEquals } from "@std/assert";
import opportunityList from "../../actions/opportunity-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const PAGE = { opportunities: [{ id: "1" }], next_page_token: "n" };

Deno.test("opportunity-list: reads the opportunities collection", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  const out = await opportunityList.execute({}, ctx) as { count: number };
  assertEquals(pathOf(calls[0].url), "/crm/rest/v2/opportunities");
  assertEquals(out.count, 1);
});

Deno.test("opportunity-list: builds the documented filter clauses", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  await opportunityList.execute({ stageId: "2", contactId: "9", title: "Deal*" }, ctx);
  assertEquals(
    queryOf(calls[0].url).filter,
    "stage_id==2;contact_id==9;opportunity_title==Deal*",
  );
});

/**
 * `fields` here is array-typed but its own description says "Comma-delimited",
 * so prose wins — unlike `update_mask`, which is sent as a repeated key.
 */
Deno.test("opportunity-list: the optional-fields allowlist is comma-joined", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  await opportunityList.execute({ fields: ["custom_fields", "status_id"] }, ctx);
  assertEquals(queryOf(calls[0].url).fields, "custom_fields,status_id");
});

/** Half the enum only works where Keap's legacy opportunities feature is on. */
Deno.test("opportunity-list: the legacy-only field values are labelled as such", () => {
  const param = opportunityList.params?.find((p) => p.key === "fields");
  const options = param?.options as Array<{ value: string; label: string }>;
  const legacy = options.filter((o) => o.label.includes("legacy accounts only")).map((o) =>
    o.value
  );
  assertEquals(legacy, [
    "monthly_revenue",
    "order_revenue",
    "objection",
    "status",
    "stage_entrance_time",
  ]);
});

/**
 * The sort field is `created_time` here and `create_time` on every other v2
 * resource in this app. Sorting by the wrong one silently does nothing.
 */
Deno.test("opportunity-list: the order-by hint names created_time, not create_time", () => {
  const hint = opportunityList.params?.find((p) => p.key === "orderBy")?.hint ?? "";
  assert(hint.includes("`created_time`"));
  assert(hint.includes("not `create_time`"));
});
