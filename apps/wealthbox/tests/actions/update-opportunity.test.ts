import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-opportunity.ts";

Deno.test("update-opportunity: requires opportunityId plus the full create-set of fields", () => {
  // Wealthbox's docs mark name/target_close/probability/stage/amounts required
  // on update too — moving stage means resending all of them, not just stage.
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
  const required = (action.params ?? []).filter((p) => p.required).map((p) => p.key);
  for (const k of ["opportunityId", "name", "targetClose", "probability", "stage", "amounts"]) {
    assert(required.includes(k), `missing required param ${k}`);
  }
});

Deno.test("update-opportunity: PUTs /opportunities/{id} with the mapped body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 1 } }]);
  const amounts = [{ amount: 100, currency: "$", kind: "Fee" }];
  await action.execute({
    opportunityId: 1,
    name: "Financial Plan",
    targetClose: "2025-12-01",
    probability: 80,
    stage: 2,
    amounts,
  }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).pathname, "/v1/opportunities/1");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Financial Plan",
    target_close: "2025-12-01",
    probability: 80,
    stage: 2,
    amounts,
  });
});
