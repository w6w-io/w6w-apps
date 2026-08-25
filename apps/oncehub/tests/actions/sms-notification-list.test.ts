import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/sms-notification-list.ts";

Deno.test("sms-notification-list: GETs /notifications/sms with filters", async () => {
  const { ctx, calls } = mockCtx([{ body: { object: "list", data: [] } }]);
  await action.execute(
    {
      creationTimeGt: "2025-11-01T00:00:00Z",
      creationTimeLt: "2025-12-01T00:00:00Z",
      recipient: "CTC-555444333",
      recipientType: "contact",
      expand: "recipient",
    },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/notifications/sms");
  assertEquals(url.searchParams.get("creation_time.gt"), "2025-11-01T00:00:00Z");
  assertEquals(url.searchParams.get("creation_time.lt"), "2025-12-01T00:00:00Z");
  assertEquals(url.searchParams.get("recipient"), "CTC-555444333");
  assertEquals(url.searchParams.get("recipient_type"), "contact");
  assertEquals(url.searchParams.get("expand"), "recipient");
});
