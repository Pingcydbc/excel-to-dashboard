import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined || isNaN(Number(value))) return "0";
  return new Intl.NumberFormat("th-TH").format(Number(value));
}

export function formatPercent(value: number | string | null | undefined, decimals: number = 1): string {
  if (value === null || value === undefined || isNaN(Number(value))) return "0%";
  return `${Number(value).toFixed(decimals)}%`;
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return String(date);
  return d.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return String(date);

  const dateStr = d.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const seconds = String(d.getSeconds()).padStart(2, "0");

  return `${dateStr} ${hours}:${minutes}:${seconds} น.`;
}

export function formatDuration(ms: number | null | undefined): string {
  if (!ms || isNaN(ms)) return "-";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} วินาที`;
}

/**
 * Extract 2-digit Buddhist Era entry year prefix from a standard numeric student ID (e.g. "67209010001" -> 67).
 * Rejects 13-digit Thai Citizen IDs and future/invalid year prefixes.
 * Returns null for synthetic IDs (e.g. "2568G00001", "GRAD_1").
 */
export function extractStudentYearPrefix(studentId: string | null | undefined): number | null {
  if (!studentId) return null;
  const s = String(studentId).trim();
  // Standard vocational student IDs are 8-12 digits (13 digits is a Thai Citizen ID)
  if (!/^\d{8,12}$/.test(s)) return null;
  const prefix = parseInt(s.substring(0, 2), 10);
  const currentMaxPrefix = new Date().getFullYear() + 543 - 2500 + 1; // e.g. 70 in 2569
  if (isNaN(prefix) || prefix < 50 || prefix > currentMaxPrefix) return null;
  return prefix;
}

/**
 * Check if a single record matches the default cohort rule relative to baseYearPrefix (e.g. 68 for 2568):
 * - ปวช.: ย้อนหลังไป 2 ปี (baseYearPrefix, baseYearPrefix - 1, baseYearPrefix - 2)
 * - ปวส.: ย้อนหลังไป 1 ปี (baseYearPrefix, baseYearPrefix - 1)
 * - ป.ตรี / ทล.บ.: ย้อนหลังไป 1 ปี (baseYearPrefix, baseYearPrefix - 1)
 */
export function isRecordInDefaultCohort(
  studentId: string | null | undefined,
  educationLevel: string | null | undefined,
  baseYearPrefix: number
): boolean {
  const s = String(studentId || "").trim();
  const prefix = extractStudentYearPrefix(s);
  if (prefix === null) {
    // Reject purely numeric IDs that failed validation (e.g. 13-digit Citizen IDs or invalid years)
    if (/^\d+$/.test(s)) return false;
    // Keep synthetic summary IDs (e.g. "2568G00001", "GRAD_1")
    return true;
  }

  const lv = String(educationLevel || "").trim();
  if (lv.includes("ปวส")) {
    return prefix >= baseYearPrefix - 1 && prefix <= baseYearPrefix;
  }
  if (lv.includes("ตรี") || lv.includes("ปริญญา") || lv.includes("ทล.บ.")) {
    return prefix >= baseYearPrefix - 1 && prefix <= baseYearPrefix;
  }
  // Default ปวช. (ย้อนหลัง 2 ปี)
  return prefix >= baseYearPrefix - 2 && prefix <= baseYearPrefix;
}

/**
 * Exact major filter matching after trimming trailing/leading whitespace.
 */
export function matchesMajorFilter(
  major: string | null | undefined,
  majorParam: string
): boolean {
  if (!majorParam || majorParam === "all") return true;
  return String(major || "").trim() === majorParam.trim();
}

function getLevelBucket(educationLevel: string | null | undefined): "ปวช." | "ปวส." | "ป.ตรี" {
  const lv = String(educationLevel || "").trim();
  if (lv.includes("ปวส")) return "ปวส.";
  if (lv.includes("ตรี") || lv.includes("ปริญญา") || lv.includes("ทล.บ.")) return "ป.ตรี";
  return "ปวช.";
}

function getReliableMaxPrefixForRecords(
  records: { studentId: string }[]
): number {
  const prefixCounts = new Map<number, number>();
  let maxIdPrefix = 0;
  for (const r of records) {
    const p = extractStudentYearPrefix(r.studentId);
    if (p !== null) {
      prefixCounts.set(p, (prefixCounts.get(p) || 0) + 1);
      if (p > maxIdPrefix) {
        maxIdPrefix = p;
      }
    }
  }
  const significantPrefixes = Array.from(prefixCounts.entries())
    .filter(([, count]) => count >= 3)
    .map(([p]) => p);
  if (significantPrefixes.length > 0) {
    return Math.max(...significantPrefixes);
  }
  return maxIdPrefix;
}

/**
 * Filter a list of StudentProfileStatus or GraduateTracking records using the base year from the Excel dataset:
 * - If records have `gradYear` (e.g. 2568 -> 68), uses max `gradYear - 2500` as the primary baseYearPrefix.
 * - Otherwise computes the highest valid 2-digit studentId prefix per education level (so e.g. ป.ตรี with max 67 isn't wiped out by ปวช./ปวส. 69).
 */
export function filterByDefaultCohort<
  T extends { studentId: string; educationLevel?: string | null; gradYear?: number | null }
>(records: T[], explicitBaseYearPrefix?: number | null): { filtered: T[]; baseYearPrefix: number | null } {
  if (!records || records.length === 0) {
    return { filtered: [], baseYearPrefix: null };
  }

  let basePrefix: number | null = explicitBaseYearPrefix ?? null;
  const currentMaxPrefix = new Date().getFullYear() + 543 - 2500 + 1;

  if (!basePrefix) {
    // 1. Check if records have gradYear from the Excel file
    let maxGradYear = 0;
    for (const r of records) {
      if (r.gradYear && r.gradYear >= 2550 && r.gradYear <= 2500 + currentMaxPrefix && r.gradYear > maxGradYear) {
        maxGradYear = r.gradYear;
      }
    }
    if (maxGradYear >= 2550) {
      basePrefix = maxGradYear - 2500;
    }
  }

  const reliableMaxPrefix = getReliableMaxPrefixForRecords(records);

  // Compute per-level reliable max prefix for datasets without gradYear (e.g. StudentProfileStatus)
  const levelBaseMap = new Map<"ปวช." | "ปวส." | "ป.ตรี", number>();
  for (const bucket of ["ปวช.", "ปวส.", "ป.ตรี"] as const) {
    const bucketRecords = records.filter((r) => getLevelBucket(r.educationLevel) === bucket);
    const maxP = getReliableMaxPrefixForRecords(bucketRecords);
    if (maxP > 0) {
      levelBaseMap.set(bucket, maxP);
    }
  }

  if (!basePrefix && reliableMaxPrefix > 0) {
    basePrefix = reliableMaxPrefix;
  }

  if (!basePrefix) {
    return { filtered: records, baseYearPrefix: null };
  }

  let filtered = records.filter((r) => {
    const rowBase =
      r.gradYear && r.gradYear >= 2550 && r.gradYear <= 2500 + currentMaxPrefix
        ? r.gradYear - 2500
        : explicitBaseYearPrefix ?? levelBaseMap.get(getLevelBucket(r.educationLevel)) ?? basePrefix!;
    return isRecordInDefaultCohort(r.studentId, r.educationLevel, rowBase);
  });

  // Fallback to reliableMaxPrefix if gradYear-based filtering yielded 0
  if (filtered.length === 0 && reliableMaxPrefix > 0 && reliableMaxPrefix !== basePrefix) {
    basePrefix = reliableMaxPrefix;
    filtered = records.filter((r) =>
      isRecordInDefaultCohort(r.studentId, r.educationLevel, reliableMaxPrefix)
    );
  }

  return { filtered, baseYearPrefix: basePrefix };
}
