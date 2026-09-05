import { assertEquals } from "@std/assert";
import registrantGet from "../../actions/registrant-get.ts";
import { mockCtxWithOrganizer, pathOf } from "../_helpers.ts";

Deno.test("registrant-get: reads a single registrant by key", async () => {
  const { ctx, calls } = mockCtxWithOrganizer(
    [{ body: { registrantKey: 5, email: "a@b.com" } }],
    "org-1",
  );
  const out = await registrantGet.execute({ webinarKey: "9", registrantKey: "5" }, ctx);
  assertEquals(pathOf(calls[0].url), "/G2W/rest/v2/organizers/org-1/webinars/9/registrants/5");
  assertEquals(out, { registrantKey: 5, email: "a@b.com" });
});
