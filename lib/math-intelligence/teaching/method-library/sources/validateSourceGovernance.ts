import { PHASE4B_SOURCE_MANIFEST } from "./sourceManifest";
import type {
  Phase4BSourceManifestIssue,
  Phase4BSourceRecord,
} from "./types";

function isHttpUrl(value: string): boolean {
  return /^https:\/\//i.test(value);
}

export function validatePhase4BSourceManifest(
  manifest: readonly Phase4BSourceRecord[] = PHASE4B_SOURCE_MANIFEST,
): Phase4BSourceManifestIssue[] {
  const issues: Phase4BSourceManifestIssue[] = [];
  const seen = new Set<string>();

  for (const source of manifest) {
    if (!source.sourceId.trim()) {
      issues.push({ code: "MISSING_SOURCE_ID", sourceId: null, message: "Every source requires a stable sourceId." });
    } else if (seen.has(source.sourceId)) {
      issues.push({ code: "DUPLICATE_SOURCE_ID", sourceId: source.sourceId, message: `Duplicate sourceId: ${source.sourceId}` });
    } else {
      seen.add(source.sourceId);
    }

    if (!source.title.trim()) {
      issues.push({ code: "MISSING_TITLE", sourceId: source.sourceId || null, message: "Source title is required." });
    }
    if (!source.publisher.trim()) {
      issues.push({ code: "MISSING_PUBLISHER", sourceId: source.sourceId || null, message: "Source publisher is required." });
    }
    if (source.sourceClass !== "official_curriculum" && source.sourceClass !== "common_singapore_pedagogy") {
      issues.push({ code: "INVALID_SOURCE_CLASS", sourceId: source.sourceId || null, message: `External source class ${String(source.sourceClass)} is not permitted.` });
    }
    if (!isHttpUrl(source.url)) {
      issues.push({ code: "INVALID_URL", sourceId: source.sourceId || null, message: "Source URL must use https." });
    }
    if (source.allowedClaimTags.length === 0) {
      issues.push({ code: "NO_ALLOWED_CLAIM_TAGS", sourceId: source.sourceId || null, message: "Every source must declare at least one allowed claim tag." });
    }
    if (source.supports.length === 0) {
      issues.push({ code: "NO_SUPPORT_STATEMENTS", sourceId: source.sourceId || null, message: "Every source must state what it supports." });
    }
    if (
      source.sourceClass === "official_curriculum" &&
      !/Ministry of Education/i.test(source.publisher)
    ) {
      issues.push({
        code: "OFFICIAL_SOURCE_NON_GOVERNMENT_PUBLISHER",
        sourceId: source.sourceId || null,
        message: "An official_curriculum source must be published by the Singapore Ministry of Education.",
      });
    }
  }

  return issues;
}
