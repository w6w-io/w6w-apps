import { assertEquals } from "@std/assert";
import action from "../../actions/invitation-send-email.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("invitation-send-email: POSTs to the invitations-api host with the documented body shape", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { queued: true } }]);

  const out = await action.execute(
    {
      businessUnitId: "bu1",
      consumerEmail: "john.doe@example.com",
      consumerName: "John Doe",
      referenceNumber: "inv00001",
      locale: "en-US",
      templateId: "507f191e810c19729de860ea",
      redirectUri: "http://example.com",
      tags: "tag1, tag2",
    },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(
    new URL(calls[0].url).host,
    "invitations-api.trustpilot.com",
    "must call the Invitations API's own host",
  );
  assertEquals(pathOf(calls[0].url), "/v1/private/business-units/bu1/email-invitations");

  const body = JSON.parse(calls[0].body!);
  assertEquals(body.type, "email");
  assertEquals(body.consumerEmail, "john.doe@example.com");
  assertEquals(body.referenceNumber, "inv00001");
  assertEquals(body.serviceReviewInvitation.templateId, "507f191e810c19729de860ea");
  assertEquals(body.serviceReviewInvitation.tags, ["tag1", "tag2"]);
  assertEquals((out as { response: unknown }).response, { queued: true });
});

Deno.test("invitation-send-email: is declared unsafe to retry", () => {
  assertEquals(action.idempotent, false);
});
