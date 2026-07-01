import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/sheet-create.ts";

Deno.test("sheet-create: batchUpdate/addSheet with title + hex→rgb tab color", async () => {
  const { ctx, calls } = mockCtx([{ body: { replies: [{}] } }]);
  await action.execute({
    spreadsheetId: "ss-1",
    title: "New Tab",
    tabColor: "0aa55c",
  }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v4/spreadsheets/ss-1:batchUpdate");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.requests[0].addSheet.properties.title, "New Tab");
  const color = body.requests[0].addSheet.properties.tabColor;
  // 0a = 10/255, a5 = 165/255, 5c = 92/255.
  assertEquals(color.red, 10 / 255);
  assertEquals(color.green, 165 / 255);
  assertEquals(color.blue, 92 / 255);
});
