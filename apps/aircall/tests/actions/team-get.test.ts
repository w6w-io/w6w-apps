import { assertEquals } from "@std/assert";
import teamGet from "../../actions/team-get.ts";
import { entityBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("team-get: reads GET /v1/teams/{id} and unwraps the envelope", async () => {
  const { ctx, calls } = mockCtx([
    { body: entityBody("team", { id: 678, name: "Global Sales", users: [] }) },
  ]);
  const out = await teamGet.execute({ teamId: "678" }, ctx) as { name: string };

  assertEquals(pathOf(calls[0].url), "/v1/teams/678");
  assertEquals(out.name, "Global Sales");
});
