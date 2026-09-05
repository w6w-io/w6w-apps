import { assertEquals } from "@std/assert";
import registrantCreate from "../../actions/registrant-create.ts";
import { mockCtxWithOrganizer, pathOf } from "../_helpers.ts";

Deno.test("registrant-create: posts required fields, dropping unset optionals", async () => {
  const { ctx, calls } = mockCtxWithOrganizer(
    [{ status: 201, body: { registrantKey: 1, joinUrl: "https://x" } }],
    "org-1",
  );
  const out = await registrantCreate.execute({
    webinarKey: "9",
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.com",
  }, ctx);

  assertEquals(pathOf(calls[0].url), "/G2W/rest/v2/organizers/org-1/webinars/9/registrants");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { firstName: "Ada", lastName: "Lovelace", email: "ada@example.com" });
  assertEquals(out, { registrantKey: 1, joinUrl: "https://x" });
});
