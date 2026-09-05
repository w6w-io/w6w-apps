import { assertEquals } from "@std/assert";
import registrantDelete from "../../actions/registrant-delete.ts";
import { mockCtxWithOrganizer, pathOf } from "../_helpers.ts";

Deno.test("registrant-delete: DELETEs a registrant and reports the vendor's 204", async () => {
  const { ctx, calls } = mockCtxWithOrganizer([{ status: 204 }], "org-1");
  const out = await registrantDelete.execute({ webinarKey: "9", registrantKey: "5" }, ctx);
  assertEquals(pathOf(calls[0].url), "/G2W/rest/v2/organizers/org-1/webinars/9/registrants/5");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { status: 204 });
});
