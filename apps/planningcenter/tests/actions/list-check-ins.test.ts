import { assertEquals } from "@std/assert";
import listCheckIns from "../../actions/list-check-ins.ts";
import { collection, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("list-check-ins: calls GET /check-ins/v2/check_ins", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: collection("CheckIn", [
        {
          id: "1",
          attributes: {
            first_name: "Jane",
            last_name: "Doe",
            kind: "regular",
            security_code: "AB12",
          },
          relationships: { person: { data: { type: "Person", id: "7" } } },
        },
      ]),
    },
  ]);
  const out = await listCheckIns.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/check-ins/v2/check_ins");
  assertEquals(out.checkIns[0].securityCode, "AB12");
  assertEquals(out.checkIns[0].personId, "7");
});

/**
 * The Check-Ins API's own `CheckIn` schema carries `emergency_contact_name`,
 * `emergency_contact_phone_number` and `medical_notes` — this action must
 * never surface them, regardless of what the vendor's response contains.
 */
Deno.test("list-check-ins: never surfaces emergency-contact or medical-notes fields", async () => {
  const { ctx } = mockCtx([
    {
      body: collection("CheckIn", [
        {
          id: "1",
          attributes: {
            first_name: "Jane",
            emergency_contact_name: "John Doe",
            emergency_contact_phone_number: "555-0100",
            medical_notes: "peanut allergy",
          },
        },
      ]),
    },
  ]);
  const out = await listCheckIns.execute({}, ctx);

  const serialized = JSON.stringify(out);
  assertEquals(serialized.includes("John Doe"), false);
  assertEquals(serialized.includes("555-0100"), false);
  assertEquals(serialized.includes("peanut allergy"), false);
});

Deno.test("list-check-ins: eventId maps to where[event_id]", async () => {
  const { ctx, calls } = mockCtx([{ body: collection("CheckIn", []) }]);
  await listCheckIns.execute({ eventId: "event_1" }, ctx);

  assertEquals(queryOf(calls[0].url)["where[event_id]"], "event_1");
});
