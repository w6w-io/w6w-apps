/**
 * Every content/worksheet operation accepts EITHER `worksheet_name` OR
 * `worksheet_id` — Zoho documents them as alternatives, never both required.
 * Failing fast here (rather than letting Zoho answer `2831 Missing parameter`
 * or `2877 Invalid worksheet name`) gives a clearer message before a network
 * call is even made.
 */
export function requireWorksheetLocator(
  input: { worksheetName?: string; worksheetId?: string },
): { worksheet_name?: string; worksheet_id?: string } {
  const name = input.worksheetName?.trim();
  const id = input.worksheetId?.trim();
  if (!name && !id) {
    throw new Error("Either `worksheetName` or `worksheetId` is required.");
  }
  return { worksheet_name: name || undefined, worksheet_id: id || undefined };
}
