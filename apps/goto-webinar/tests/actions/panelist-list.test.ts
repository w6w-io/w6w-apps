import { assertEquals } from "@std/assert";
import panelistList from "../../actions/panelist-list.ts";
import { mockCtxWithOrganizer, pathOf } from "../_helpers.ts";

Deno.test("panelist-list: the response is a bare array", async () => {
  const { ctx, calls } = mockCtxWithOrganizer(
    [{ body: [{ panelistId: 1 }] }],
    "org-1",
  );
  const out = await panelistList.execute({ webinarKey: "9" }, ctx) as { panelists: unknown[] };
  assertEquals(pathOf(calls[0].url), "/G2W/rest/v2/organizers/org-1/webinars/9/panelists");
  assertEquals(out.panelists, [{ panelistId: 1 }]);
});
