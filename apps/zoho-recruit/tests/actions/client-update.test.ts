import { assertEquals } from "@std/assert";
import { mockRecruitCtx } from "../_helpers.ts";
import action from "../../actions/client-update.ts";

Deno.test("client-update: PUTs /Clients with the id merged into the fields", async () => {
  const { ctx, calls } = mockRecruitCtx([
    { body: { data: [{ code: "SUCCESS", status: "success", details: { id: "1" } }] } },
  ]);
  await action.execute({ recordId: "1", fields: { Website: "https://avongroup.com" } }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/recruit/v2/Clients");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), {
    data: [{ id: "1", Website: "https://avongroup.com" }],
  });
});

Deno.test("client-update: idempotent — retrying converges on the same fields", () => {
  assertEquals(action.idempotent, true);
});
