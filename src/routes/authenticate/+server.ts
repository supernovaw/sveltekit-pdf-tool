import { error, json, type RequestHandler } from "@sveltejs/kit";

const authorisedKeys = ["pass"];

export const POST: RequestHandler = async ({ request }) => {
  let payload;
  try {
    payload = await request.json();
  } catch (e: any) {
    throw error(400, e.message);
  }
  if (typeof payload !== "object") throw error(400, "not an object");
  if (typeof payload.action !== "string") throw error(400, "no action string");

  switch (payload.action) {
    case "verify":
      return json({ valid: authorisedKeys.includes(payload.key) });
    default:
      throw error(400, "unknown action '" + payload.action + "'");
  }
}
