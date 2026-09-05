import { assertEquals } from "@std/assert";
import { mockRecruitCtx } from "../_helpers.ts";
import action from "../../actions/client-create.ts";

Deno.test("client-create: POSTs the fields wrapped in a data array", async () => {
  const { ctx, calls } = mockRecruitCtx([
    { body: { data: [{ code: "SUCCESS", status: "success", details: { id: "1" } }] } },
  ]);
  await action.execute({ fields: { Client_Name: "Avon Group" } }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/recruit/v2/Clients");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { data: [{ Client_Name: "Avon Group" }] });
});

Deno.test("client-create: not idempotent — every call creates a new record", () => {
  assertEquals(action.idempotent, false);
});
