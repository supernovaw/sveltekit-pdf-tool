import { error, json, type RequestHandler } from "@sveltejs/kit";
import { authorisedKeys } from "../authenticate/+server";
import fs from "fs";
import child_process from "child_process";

const PDF_DIR = "./user-pdfs";
if (!fs.existsSync(PDF_DIR)) fs.mkdirSync(PDF_DIR);
function getServersideFilename(key: string): string {
  if (!authorisedKeys.includes(key)) throw error(401);
  if (key.startsWith("../") || key.includes("/../")) throw error(500, "invalid key");
  return `${PDF_DIR}/${key}.pdf`;
}

export const POST: RequestHandler = async ({ request }) => {
  const formData = await request.formData();

  const key = String(formData.get("key"));
  if (!authorisedKeys.includes(key))
    throw error(401, "authentication failed");

  const action = String(formData.get("action"));
  switch (action) {
    case "upload":
      return await handleUpload(formData, key);
    case "remove":
      return await handleRemove(key);
    default:
      throw error(400, "unknown action '" + action + "'");
  }
}

async function handleUpload(formData: FormData, key: string) {
  const document = formData.get("document");
  if (!(document instanceof Blob))
    throw error(400, "not a file");
  if (document.size > 256 * 1024 * 1024)
    throw error(400, "file size exceeds 256 MiB");

  const filename = getServersideFilename(key);
  fs.writeFileSync(filename, Buffer.from(await document.arrayBuffer()));
  const savedBytes = fs.statSync(filename).size;
  if (savedBytes !== document.size)
    throw error(500, `fs write failed (${savedBytes}/${document.size})`);

  // Example: "./user-pdfs/key1.pdf: PDF document, version 1.4, 585 pages"
  let fileInfo = child_process
    .execSync(`file '${filename.replaceAll("'", "'\\''")}'`)
    .toString();

  if (!fileInfo.startsWith(filename + ": "))
    throw error(500, "unexpected problem when processing file");
  fileInfo = fileInfo.substring((filename.length + 2)).trimEnd();

  if (!fileInfo.startsWith("PDF document"))
    throw error(400, "not a valid PDF document");

  const match = fileInfo.match(/ (\d+) pages/);
  if (!match) throw error(400, "failed to check page count");
  const pages: number = +match[1];
  return json({ pages });
}

async function handleRemove(key: string) {
  const filename = getServersideFilename(key);
  if (fs.existsSync(filename)) {
    fs.rmSync(getServersideFilename(key));
  }
  return json({ success: true });
}
