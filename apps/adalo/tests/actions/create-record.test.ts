import { assertEquals } from "@std/assert";
import { APP_ID, mockConnectedCtx, pathOf } from "../_helpers.ts";
import action from "../../actions/create-record.ts";

Deno.test("create-record: POSTs fields to /v0/apps/{appId}/collections/{id}", async () => {
  const { ctx, calls } = mockConnectedCtx([{ body: { id: "1" } }]);
  const result = await action.execute!(
    { collectionId: "c1", fields: { Name: "Ada", Score: 10 } },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), `/v0/apps/${APP_ID}/collections/c1`);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { Name: "Ada", Score: 10 });
  assertEquals(result, { id: "1" });
});

Deno.test("create-record: never sets an authorization header itself", async () => {
  const { ctx, calls } = mockConnectedCtx([{ body: { id: "1" } }]);
  await action.execute!({ collectionId: "c1", fields: { Name: "Ada" } }, ctx);
  assertEquals(calls[0].headers["authorization"], undefined);
});
