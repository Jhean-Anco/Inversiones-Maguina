import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export function verifyQualityGate({ qualityResult, imagesResult }) {
  const results = { quality: qualityResult ?? "missing", images: imagesResult ?? "missing" };
  const failed = Object.entries(results).filter(([, result]) => result !== "success");
  if (failed.length) {
    throw new Error(`Production quality gate blocked: ${failed.map(([job, result]) => `${job}=${result}`).join(", ")}`);
  }
  return results;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    verifyQualityGate({ qualityResult: process.env.QUALITY_RESULT, imagesResult: process.env.IMAGES_RESULT });
    console.log("All required production checks completed successfully.");
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Production quality gate blocked.");
    process.exitCode = 1;
  }
}
