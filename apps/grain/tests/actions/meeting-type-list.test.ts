import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/meeting-type-list.ts";

Deno.test("meeting-type-list: POSTs /v2/meeting_types with an empty body and no params", async () => {
  const { ctx, calls } = mockCtx([
    { body: { meeting_types: [{ id: "mt1", name: "Sales", scope: "external" }] } },
  ]);
  const result = await action.execute({}, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/_/public-api/v2/meeting_types");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].body, "{}");
  assertEquals(result, { meetingTypes: [{ id: "mt1", name: "Sales", scope: "external" }] });
  assertEquals(action.params, []);
});

Deno.test("meeting-type-list: defaults to an empty array when Grain omits meeting_types", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  const result = await action.execute({}, ctx);
  assertEquals(result, { meetingTypes: [] });
});
