import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/refresh-dataset.ts";

Deno.test("refresh-dataset: POSTs /datasets/{id}/refreshes with notifyOption", async () => {
  const { ctx, calls } = mockCtx([{
    status: 202,
    headers: {
      "x-ms-request-id": "req-1",
      "location": "https://api.powerbi.com/v1.0/myorg/datasets/d1/refreshes/1",
    },
  }]);
  const out = await action.execute({ datasetId: "d1", notifyOption: "MailOnFailure" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/myorg/datasets/d1/refreshes");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { notifyOption: "MailOnFailure" });
  assertEquals(out.status, 202);
  assertEquals(out.requestId, "req-1");
});

Deno.test("refresh-dataset: enhanced refresh options merge alongside notifyOption", async () => {
  const { ctx, calls } = mockCtx([{ status: 202 }]);
  await action.execute({
    datasetId: "d1",
    notifyOption: "NoNotification",
    options: { type: "Full", objects: [{ table: "Sales" }] },
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.notifyOption, "NoNotification");
  assertEquals(body.type, "Full");
  assertEquals(body.objects, [{ table: "Sales" }]);
});

Deno.test("refresh-dataset: a Workspace ID scopes the call", async () => {
  const { ctx, calls } = mockCtx([{ status: 202 }]);
  await action.execute({ groupId: "w1", datasetId: "d1", notifyOption: "NoNotification" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/myorg/groups/w1/datasets/d1/refreshes");
});

Deno.test("refresh-dataset: every call starts a new refresh job — not idempotent", () => {
  assertEquals(action.idempotent, false);
});
