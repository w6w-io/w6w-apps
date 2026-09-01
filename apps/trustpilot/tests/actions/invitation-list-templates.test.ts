import { assertEquals } from "@std/assert";
import action from "../../actions/invitation-list-templates.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("invitation-list-templates: calls the invitations-api host, not api.trustpilot.com", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: {
        templates: [
          { id: "t1", name: "Standard template for English", isDefaultTemplate: true },
        ],
      },
    },
  ]);

  const out = await action.execute({ businessUnitId: "bu1" }, ctx);

  assertEquals(
    new URL(calls[0].url).host,
    "invitations-api.trustpilot.com",
    "must call the Invitations API's own host",
  );
  assertEquals(
    pathOf(calls[0].url),
    "/v1/private/business-units/bu1/templates",
  );
  assertEquals(out.items[0].id, "t1");
});

Deno.test("invitation-list-templates: a missing templates array becomes an empty items array", async () => {
  const { ctx } = mockCtx([{ status: 200, body: {} }]);
  const out = await action.execute({ businessUnitId: "bu1" }, ctx);
  assertEquals(out.items, []);
});
