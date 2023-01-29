import { error, json, type RequestHandler } from "@sveltejs/kit";
import { authorisedKeys } from "../authenticate/+server";
import fs from "fs";
import child_process from "child_process";
import { removeConsecutiveDuplicates } from "$lib/arrayUtils";

const PDF_DIR = "./user-pdfs";
if (!fs.existsSync(PDF_DIR)) fs.mkdirSync(PDF_DIR);
function getServersideFilename(key: string): string {
  if (!authorisedKeys.includes(key)) throw error(401);
  if (key.startsWith("../") || key.includes("/../")) throw error(500, "invalid key");
  return `${PDF_DIR}/${key}.orig.pdf`;
}
function getServersideExtractedFilename(key: string): string {
  if (!authorisedKeys.includes(key)) throw error(401);
  if (key.startsWith("../") || key.includes("/../")) throw error(500, "invalid key");
  return `${PDF_DIR}/${key}.extr.pdf`;
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
    case "extract":
      return await handleExtract(formData, key);
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

  return json({ pages: getPagesCount(filename) });
}

async function handleRemove(key: string) {
  const filename = getServersideFilename(key);
  const extractedFilename = getServersideExtractedFilename(key);

  if (fs.existsSync(filename)) fs.rmSync(filename);
  if (fs.existsSync(extractedFilename)) fs.rmSync(extractedFilename);

  return json({ success: true });
}

async function handleExtract(formData: FormData, key: string) {
  // Validate and parse pages
  let pages: any[] = String(formData.get("pages")).split(",");
  for (const p of pages)
    if (!p.match(/^\d+$/)) throw error(400, "invalid pages list");

  const origFile = getServersideFilename(key);
  const extrFile = getServersideExtractedFilename(key);

  const pagesCount = getPagesCount(origFile);
  pages = pages.map(v => parseInt(v)).sort();
  removeConsecutiveDuplicates(pages);
  if (pages.length === pagesCount)
    throw error(400, "all pages selected");
  for (const p of pages)
    if (p < 1 || p > pagesCount)
      throw error(400, `out of range page (${p}/${pagesCount})`);

  return extractDocument(origFile, extrFile, pages);
}

function getPagesCount(filename: string): number {
  if (!fs.existsSync(filename))
    throw error(500, "file missing");
  let metadataDump;
  try {
    metadataDump = child_process
      .execSync(`pdftk '${filename.replaceAll("'", "'\\''")}' dump_data`)
      .toString()
      .split("\n");
  } catch (e) {
    throw error(400, "could not process (invalid file?)");
  }
  for (const line of metadataDump) {
    const match = line.match(/^NumberOfPages: (\d+)$/);
    if (match) {
      return +match[1];
    }
  }
  throw error(400, "failed to check page count");
}

export const GET: RequestHandler = async ({ url }) => {
  const key = String(url.searchParams.get("key"));
  if (!authorisedKeys.includes(key))
    throw error(401, "unauthenticated");

  const filename = getServersideExtractedFilename(key);
  if (!fs.existsSync(filename))
    throw error(500, "missing file");
  const response = new Response(fs.readFileSync(filename));
  response.headers.set("Content-Type", "application/pdf");
  return response;
}

// This function accepts already validated arguments
function extractDocument(sourceFile: string, targetFile: string, pages: number[]) {
  const sourceEscaped = "'" + sourceFile.replaceAll("'", "'\\''") + "'";
  const targetEscaped = "'" + targetFile.replaceAll("'", "'\\''") + "'";
  const pagesArg = pages.join(" "); // e.g. "5 6 7 10 13 14 15"
  const command = `pdftk ${sourceEscaped} cat ${pagesArg} output ${targetEscaped}`;
  try {
    child_process.execSync(command).toString();
  } catch (e: any) {
    console.log(e.message);
    throw error(500, "command execution failed");
  }
  return json({ success: true });
}
