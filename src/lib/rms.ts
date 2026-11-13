import { filterByDefaultCohort } from "./utils";

export interface RmsStudent {
  id: string;
  prefix: string;
  name: string;
  surname: string;
  group_id: string;
  number?: number;
}

export interface RmsComparisonResult<T> {
  filtered: T[];
  baseYearPrefix: number | null;
  rmsComparison: {
    enabled: boolean;
    totalRms: number;
    matchedCount: number;
    matchedByIdCount: number;
    matchedByNameCount: number;
    missingInVcopCount: number;
    missingInVcopStudents: RmsStudent[];
    inactiveInVcopCount: number;
    totalRawVcop: number;
  };
}

let cachedRmsStudents: RmsStudent[] | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function fetchAllRmsStudents(): Promise<RmsStudent[]> {
  const token = (process.env.RMS_API_TOKEN || "").trim();
  const baseUrl = (
    process.env.RMS_API_URL || "https://rms.cmtc.ac.th/api_center.php"
  ).trim();

  if (!token) {
    return [];
  }

  const now = Date.now();
  if (cachedRmsStudents && cachedRmsStudents.length > 0 && now - cachedAt < CACHE_TTL_MS) {
    return cachedRmsStudents;
  }

  try {
    const allItems: RmsStudent[] = [];
    let page = 1;
    const limit = 500;

    while (page <= 30) {
      const separator = baseUrl.includes("?") ? "&" : "?";
      const url = `${baseUrl}${separator}v=1&res=students&page=${page}&limit=${limit}`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      if (!res.ok) {
        break;
      }

      const json = await res.json();
      if (!json?.ok || !Array.isArray(json.items) || json.items.length === 0) {
        break;
      }

      for (const item of json.items) {
        const id = String(item.id || "").trim();
        if (id) {
          allItems.push({
            id,
            prefix: String(item.prefix || "").trim(),
            name: String(item.name || "").trim(),
            surname: String(item.surname || "").trim(),
            group_id: String(item.group_id || "").trim(),
            number: item.number,
          });
        }
      }

      if (!json.has_more) {
        break;
      }
      page++;
    }

    if (allItems.length > 0) {
      cachedRmsStudents = allItems;
      cachedAt = now;
    }

    return allItems;
  } catch (error) {
    console.warn("RMS API fetch warning, using cached or fallback:", error);
    return cachedRmsStudents || [];
  }
}

function inferLevelFromStudentId(studentId: string): string {
  const levelDigit = studentId.slice(2, 3);
  if (levelDigit === "3") return "ประกาศนียบัตรวิชาชีพชั้นสูง (ปวส.)";
  if (levelDigit === "4") return "ปริญญาตรีสายเทคโนโลยีหรือสายปฏิบัติการ";
  return "ประกาศนียบัตรวิชาชีพ (ปวช.)";
}

export async function filterProfilesWithRms<
  T extends {
    id?: string;
    studentId: string;
    prefix?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    educationLevel?: string | null;
    faculty?: string | null;
    major?: string | null;
    minor?: string | null;
    completeness?: number | null;
    gradYear?: number | null;
  }
>(records: T[]): Promise<RmsComparisonResult<T>> {
  if (!records || records.length === 0) {
    return {
      filtered: [],
      baseYearPrefix: null,
      rmsComparison: {
        enabled: false,
        totalRms: 0,
        matchedCount: 0,
        matchedByIdCount: 0,
        matchedByNameCount: 0,
        missingInVcopCount: 0,
        missingInVcopStudents: [],
        inactiveInVcopCount: 0,
        totalRawVcop: 0,
      },
    };
  }

  const rmsStudents = await fetchAllRmsStudents();

  if (rmsStudents.length > 0) {
    const byIdMap = new Map<string, T>();
    const byNameMap = new Map<string, T>();
    const deptCodeMap = new Map<
      string,
      { educationLevel: string; major: string; faculty?: string | null }
    >();

    for (const r of records) {
      const sid = String(r.studentId || "").trim();
      if (sid) {
        byIdMap.set(sid, r);
        if (sid.length >= 7 && r.major) {
          const deptCode = sid.slice(2, 7);
          if (!deptCodeMap.has(deptCode)) {
            deptCodeMap.set(deptCode, {
              educationLevel: r.educationLevel || inferLevelFromStudentId(sid),
              major: r.major,
              faculty: r.faculty || null,
            });
          }
        }
      }

      const fName = String(r.firstName || "").trim();
      const lName = String(r.lastName || "").trim();
      if (fName && lName) {
        const nameKey = `${fName}|${lName}`;
        const existing = byNameMap.get(nameKey);
        if (!existing || (r.completeness || 0) >= (existing.completeness || 0)) {
          byNameMap.set(nameKey, r);
        }
      }
    }

    const combined: T[] = [];
    const missingInVcopStudents: RmsStudent[] = [];
    let matchedByIdCount = 0;
    let matchedByNameCount = 0;

    for (const rms of rmsStudents) {
      const exactMatch = byIdMap.get(rms.id);
      if (exactMatch) {
        matchedByIdCount++;
        combined.push(exactMatch);
        continue;
      }

      const deptInfo = deptCodeMap.get(rms.id.slice(2, 7));
      const nameKey = `${rms.name}|${rms.surname}`;
      const nameMatch = rms.name && rms.surname ? byNameMap.get(nameKey) : undefined;

      if (nameMatch) {
        matchedByNameCount++;
        combined.push({
          ...nameMatch,
          id: nameMatch.id || `rms_${rms.id}`,
          studentId: rms.id,
          prefix: rms.prefix || nameMatch.prefix || "",
          firstName: rms.name,
          lastName: rms.surname,
          educationLevel:
            deptInfo?.educationLevel ||
            nameMatch.educationLevel ||
            inferLevelFromStudentId(rms.id),
          faculty: deptInfo?.faculty ?? nameMatch.faculty ?? null,
          major: deptInfo?.major || nameMatch.major || "ไม่ระบุ",
          completeness: nameMatch.completeness ?? 0,
        });
        continue;
      }

      // Not found in uploaded file by ID or name -> include as 0% so total matches RMS (3,269)
      missingInVcopStudents.push(rms);
      combined.push({
        id: `rms_missing_${rms.id}`,
        studentId: rms.id,
        prefix: rms.prefix || "",
        firstName: rms.name,
        lastName: rms.surname,
        educationLevel: deptInfo?.educationLevel || inferLevelFromStudentId(rms.id),
        faculty: deptInfo?.faculty ?? null,
        major: deptInfo?.major || "ไม่ระบุ",
        minor: null,
        completeness: 0,
      } as unknown as T);
    }

    // Sort by completeness desc, studentId asc (matching database order)
    combined.sort((a, b) => {
      const diff = (b.completeness || 0) - (a.completeness || 0);
      if (diff !== 0) return diff;
      return String(a.studentId || "").localeCompare(String(b.studentId || ""));
    });

    const matchedTotal = matchedByIdCount + matchedByNameCount;

    return {
      filtered: combined,
      baseYearPrefix: null,
      rmsComparison: {
        enabled: true,
        totalRms: rmsStudents.length,
        matchedCount: matchedTotal,
        matchedByIdCount,
        matchedByNameCount,
        missingInVcopCount: missingInVcopStudents.length,
        missingInVcopStudents,
        inactiveInVcopCount: Math.max(0, records.length - matchedTotal),
        totalRawVcop: records.length,
      },
    };
  }

  // Fallback to default cohort rule if RMS_API_TOKEN is not set or RMS is unreachable
  const fallback = filterByDefaultCohort(records);
  return {
    filtered: fallback.filtered,
    baseYearPrefix: fallback.baseYearPrefix,
    rmsComparison: {
      enabled: false,
      totalRms: 0,
      matchedCount: fallback.filtered.length,
      matchedByIdCount: fallback.filtered.length,
      matchedByNameCount: 0,
      missingInVcopCount: 0,
      missingInVcopStudents: [],
      inactiveInVcopCount: Math.max(0, records.length - fallback.filtered.length),
      totalRawVcop: records.length,
    },
  };
}
