import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-design-export-job.ts";

Deno.test("get-design-export-job: GETs /rest/v1/exports/{id} and unwraps job", async () => {
  const { ctx, calls } = mockCtx([{
    body: { job: { id: "e1", status: "success", urls: ["https://export-download.canva.com/x"] } },
  }]);
  const result = await action.execute({ exportId: "e1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/rest/v1/exports/e1");
  assertEquals(result, {
    id: "e1",
    status: "success",
    urls: ["https://export-download.canva.com/x"],
  });
});
