import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/segment-contact-remove.ts";

const conn = { display: { baseUrl: "https://mautic.example.com" } };

Deno.test("segment-contact-remove: POSTs /segments/{segmentId}/contact/{contactId}/remove", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { success: 1 } }], conn);
  await action.execute!({ segmentId: 3, contactId: 47 }, ctx);
  assertEquals(calls[0].url, "https://mautic.example.com/api/segments/3/contact/47/remove");
});
