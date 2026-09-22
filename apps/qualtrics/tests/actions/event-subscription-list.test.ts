import { assertEquals } from "@std/assert";
import eventSubscriptionList from "../../actions/event-subscription-list.ts";
import { API_ROOT, listEnvelope, mockCtx } from "../_helpers.ts";

Deno.test("event-subscription-list: calls GET /eventsubscriptions", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: "SUB_1" }]) }]);
  const out = await eventSubscriptionList.execute({}, ctx) as { elements: unknown[] };

  assertEquals(calls[0].url, `${API_ROOT}/eventsubscriptions`);
  assertEquals(out.elements, [{ id: "SUB_1" }]);
});

Deno.test("event-subscription-list: follows nextPage", async () => {
  const page2 = "https://iad1.qualtrics.com/API/v3/eventsubscriptions?offset=10";
  const { ctx, calls } = mockCtx([
    { body: listEnvelope([{ id: "SUB_1" }], page2) },
    { body: listEnvelope([{ id: "SUB_2" }]) },
  ]);

  await eventSubscriptionList.execute({}, ctx);
  assertEquals(calls[1].url, page2);
});
