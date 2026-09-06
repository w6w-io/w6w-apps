import { assertEquals } from "@std/assert";
import { buildTaskBody } from "../../lib/task.ts";

Deno.test("buildTaskBody: description and dueOn pass through", () => {
  assertEquals(
    buildTaskBody({ description: "Email product details", dueOn: "2014-05-20" }),
    { description: "Email product details", dueOn: "2014-05-20" },
  );
});

Deno.test("buildTaskBody: party nests as {id}", () => {
  assertEquals(buildTaskBody({ partyId: 11587 }), { party: { id: 11587 } });
});

Deno.test("buildTaskBody: opportunity nests as {id}, independent of party", () => {
  assertEquals(buildTaskBody({ opportunityId: 99 }), { opportunity: { id: 99 } });
});

Deno.test("buildTaskBody: owner and category nest as {id}", () => {
  assertEquals(
    buildTaskBody({ ownerId: 1, categoryId: 4 }),
    { owner: { id: 1 }, category: { id: 4 } },
  );
});

Deno.test("buildTaskBody: status passes through untouched", () => {
  assertEquals(buildTaskBody({ status: "COMPLETED" }), { status: "COMPLETED" });
});

Deno.test("buildTaskBody: blank strings dropped, unset fields omitted entirely", () => {
  assertEquals(buildTaskBody({ description: "", detail: "" }), {});
  assertEquals(buildTaskBody({}), {});
});
