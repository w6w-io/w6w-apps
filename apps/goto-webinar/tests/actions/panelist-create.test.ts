import { assertEquals } from "@std/assert";
import panelistCreate from "../../actions/panelist-create.ts";
import { mockCtxWithOrganizer, pathOf } from "../_helpers.ts";

Deno.test("panelist-create: wraps the single panelist in the top-level array GoTo requires", async () => {
  const { ctx, calls } = mockCtxWithOrganizer(
    [{
      status: 201,
      body: [{ panelistId: 1, joinLink: "https://x", email: "a@b.com", name: "Ada" }],
    }],
    "org-1",
  );
  const out = await panelistCreate.execute(
    { webinarKey: "9", email: "a@b.com", name: "Ada" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/G2W/rest/v2/organizers/org-1/webinars/9/panelists");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), [{ email: "a@b.com", name: "Ada" }]);
  assertEquals(out, { panelistId: 1, joinLink: "https://x", email: "a@b.com", name: "Ada" });
});
