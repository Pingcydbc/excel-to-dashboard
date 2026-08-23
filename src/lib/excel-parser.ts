import * as XLSX from "xlsx";

export interface ParsedProfileStatusRecord {
  studentId: string;
  prefix?: string;
  firstName: string;
  lastName: string;
  educationLevel: string;
  faculty?: string;
  major?: string;
  minor?: string;
  lastProfileUpdate?: Date | null;
  completeness: number;
}

export interface ParsedGraduateRecord {
  studentId: string;
  fullName: string;
  citizenId?: string;
  educationLevel: string;
  faculty?: string;
  major?: string;
  gradYear: number;
  gradTerm?: string;
  trackingStatus?: string;
  furtherStudyLevel?: string;
  instituteName?: string;
  studyMajorMatch?: string;
  companyName?: string;
  jobPosition?: string;
  salaryRange?: string;
  jobMajorMatch?: string;
}

export function cleanStr(val: any): string {
  if (val === null || val === undefined) return "";
  let s = String(val).trim();
  if (s.endsWith(".0") && /^\d+\.0$/.test(s)) {
    s = s.substring(0, s.length - 2);
  }
  return s;
}

export function normalizeLevel(val: string): string {
  const s = cleanStr(val);
  if (s.includes("ปวส") || s.includes("ประกาศนียบัตรวิชาชีพชั้นสูง")) return "ปวส.";
  if (s.includes("ปวช") || s.includes("ประกาศนียบัตรวิชาชีพ")) return "ปวช.";
  if (s.includes("ปริญญาตรี") || s.includes("ทล.บ.")) return "ปริญญาตรี";
  return s || "ปวช.";
}

export function normalizeMatch(val: string): string {
  const s = cleanStr(val);
  if (s.includes("ไม่ตรง")) return "ไม่ตรงสาย";
  if (s.includes("ตรง")) return "ตรงสาย";
  return s;
}

export function parseCompleteness(val: any): number {
  if (val === null || val === undefined) return 0;
  let str = String(val).replace("%", "").trim();
  let num = parseFloat(str);
  if (isNaN(num)) return 0;
  if (num > 0 && num <= 1.0) {
    num = num * 100;
  }
  return Math.min(100, Math.max(0, Math.round(num * 10) / 10));
}

export function parseDate(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date && !isNaN(val.getTime())) return val;

  if (typeof val === "number") {
    const utcDays = Math.floor(val - 25569);
    const utcValue = utcDays * 86400;
    const dateInfo = new Date(utcValue * 1000);
    return isNaN(dateInfo.getTime()) ? null : dateInfo;
  }

  const str = String(val).trim();
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) return parsed;

  const thaiDateMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (thaiDateMatch) {
    const day = parseInt(thaiDateMatch[1], 10);
    const month = parseInt(thaiDateMatch[2], 10) - 1;
    let year = parseInt(thaiDateMatch[3], 10);
    if (year > 2400) year -= 543;
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }

  return null;
}

export function parseProfileStatusExcel(buffer: Buffer | ArrayBuffer): {
  records: ParsedProfileStatusRecord[];
  preview: any[];
  totalRows: number;
} {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: "" });

  if (rawRows.length === 0) {
    return { records: [], preview: [], totalRows: 0 };
  }

  let headerRowIdx = 6;
  for (let i = 0; i < Math.min(rawRows.length, 20); i++) {
    const row = rawRows[i];
    if (Array.isArray(row)) {
      const text = row.join(" ");
      if (text.includes("รหัสนักศึกษา") || (text.includes("ชื่อ") && text.includes("ความสมบูรณ์"))) {
        headerRowIdx = i;
        break;
      }
    }
  }

  const records: ParsedProfileStatusRecord[] = [];
  const startRow = headerRowIdx + 1;

  for (let r = startRow; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.length === 0) continue;

    // Student ID is typically at index 1 or 2
    let studentId = cleanStr(row[1]) || cleanStr(row[2]);
    if (!studentId || !/^\d{8,14}$/.test(studentId)) {
      // search first 4 cells
      for (let c = 0; c < Math.min(4, row.length); c++) {
        const v = cleanStr(row[c]);
        if (/^\d{8,14}$/.test(v)) {
          studentId = v;
          break;
        }
      }
    }

    if (!studentId || studentId.length < 5) continue;

    // In report layout: [4]=prefix, [6]=firstName, [8]=lastName
    let prefix = cleanStr(row[4]);
    let firstName = cleanStr(row[6]) || cleanStr(row[5]);
    let lastName = cleanStr(row[8]) || cleanStr(row[7]);

    // Handle single cell combined names if needed
    if (!firstName) {
      for (let c = 4; c <= 8; c++) {
        const val = cleanStr(row[c]);
        if (val && !/^\d+$/.test(val) && !val.includes("ประกาศนียบัตร") && !val.includes("อุตสาหกรรม")) {
          if (!firstName) firstName = val;
          else if (!lastName && val !== firstName) {
            lastName = val;
            break;
          }
        }
      }
    }

    if (firstName.startsWith("นาย ")) {
      prefix = "นาย";
      firstName = firstName.substring(4).trim();
    } else if (firstName.startsWith("นางสาว ")) {
      prefix = "นางสาว";
      firstName = firstName.substring(7).trim();
    } else if (firstName.startsWith("น.ส. ")) {
      prefix = "นางสาว";
      firstName = firstName.substring(5).trim();
    }

    // [11]=Level, [13]=Faculty, [15]=Major, [17]=Minor
    let levelRaw = cleanStr(row[11]) || cleanStr(row[10]) || cleanStr(row[7]);
    let faculty = cleanStr(row[13]) || cleanStr(row[12]) || cleanStr(row[8]);
    let major = cleanStr(row[15]) || cleanStr(row[14]) || cleanStr(row[9]);
    let minor = cleanStr(row[17]) || cleanStr(row[16]) || cleanStr(row[10]);

    const educationLevel = normalizeLevel(levelRaw);

    // [18] or [19] = last update date
    const lastProfileUpdate = parseDate(row[18] || row[19]);

    // [21] or last cell = completeness percent
    let compVal = row[21] || row[20] || row[row.length - 1];
    const completeness = parseCompleteness(compVal);

    records.push({
      studentId,
      prefix,
      firstName: firstName || "ไม่ระบุชื่อ",
      lastName: lastName || "",
      educationLevel,
      faculty,
      major,
      minor,
      lastProfileUpdate,
      completeness,
    });
  }

  // Deduplicate records by studentId to prevent concurrency collision during batch upsert
  const uniqueMap = new Map<string, ParsedProfileStatusRecord>();
  for (const rec of records) {
    if (!uniqueMap.has(rec.studentId)) {
      uniqueMap.set(rec.studentId, rec);
    } else {
      const existing = uniqueMap.get(rec.studentId)!;
      if (rec.completeness >= existing.completeness) {
        uniqueMap.set(rec.studentId, rec);
      }
    }
  }
  const uniqueRecords = Array.from(uniqueMap.values());

  const preview = uniqueRecords.slice(0, 10).map((r) => ({
    "รหัสนักศึกษา": r.studentId,
    "ชื่อ-นามสกุล": `${r.prefix ? r.prefix + " " : ""}${r.firstName} ${r.lastName}`.trim(),
    "ระดับการศึกษา": r.educationLevel,
    "ประเภทวิชา": r.faculty || "-",
    "สาขาวิชา": r.major || "-",
    "สาขางาน": r.minor || "-",
    "ความสมบูรณ์": `${r.completeness}%`,
  }));

  return { records: uniqueRecords, preview, totalRows: uniqueRecords.length };
}

export function parseGraduateTrackingExcel(buffer: Buffer | ArrayBuffer): {
  records: ParsedGraduateRecord[];
  preview: any[];
  totalRows: number;
} {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: "" });

  if (rawRows.length === 0) {
    return { records: [], preview: [], totalRows: 0 };
  }

  let headerRowIdx = 5;
  for (let i = 0; i < Math.min(rawRows.length, 20); i++) {
    const row = rawRows[i];
    if (Array.isArray(row)) {
      const text = row.join(" ");
      if (text.includes("ชื่อ นามสกุล") || (text.includes("ระดับชั้น") && text.includes("สาขาวิชา"))) {
        headerRowIdx = i;
        break;
      }
    }
  }

  const records: ParsedGraduateRecord[] = [];
  const startRow = headerRowIdx + 1;

  for (let r = startRow; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.length === 0) continue;

    // [0]=fullName, [2]=level, [3]=citizenId, [4]=faculty, [6]=gradYear, [8]=studentId, [13]=major
    // [16]=furtherLevel, [17]=instituteName, [18]=studyMatch, [21]=company, [22]=jobPosition, [23]=salary, [24]=jobMatch
    const fullName = cleanStr(row[0]);
    const studentId = cleanStr(row[8]) || `GRAD_${r}`;
    if (!fullName || fullName === "ชื่อ นามสกุล") continue;

    const citizenId = cleanStr(row[3]) || undefined;
    const educationLevel = normalizeLevel(cleanStr(row[2]));
    const faculty = cleanStr(row[4]);
    const major = cleanStr(row[13]);

    let gradYear = 2568;
    const rawYear = cleanStr(row[6]) || cleanStr(row[26]);
    if (rawYear) {
      const y = parseInt(rawYear, 10);
      if (!isNaN(y)) {
        gradYear = y > 2400 ? y : y + 543;
      }
    }

    const gradTerm = cleanStr(row[7]) || "2";
    const furtherStudyLevel = cleanStr(row[16]);
    const instituteName = cleanStr(row[17]);
    const studyMajorMatch = normalizeMatch(cleanStr(row[18]));

    const companyName = cleanStr(row[21]);
    const jobPosition = cleanStr(row[22]);
    const salaryRange = cleanStr(row[23]);
    const jobMajorMatch = normalizeMatch(cleanStr(row[24]));

    let trackingStatus = cleanStr(row[25]);
    if (!trackingStatus || trackingStatus === "ตรง" || trackingStatus === "ไม่ตรง") {
      if (companyName || jobPosition || salaryRange) {
        trackingStatus = "มีงานทำ";
      } else if (instituteName || furtherStudyLevel) {
        trackingStatus = "ศึกษาต่อ";
      } else {
        trackingStatus = "ว่างงาน";
      }
    }

    records.push({
      studentId,
      fullName,
      citizenId,
      educationLevel,
      faculty,
      major,
      gradYear,
      gradTerm,
      trackingStatus,
      furtherStudyLevel,
      instituteName,
      studyMajorMatch,
      companyName,
      jobPosition,
      salaryRange,
      jobMajorMatch,
    });
  }

  // Deduplicate by studentId + gradYear
  const uniqueGradsMap = new Map<string, ParsedGraduateRecord>();
  for (const rec of records) {
    const key = `${rec.studentId}_${rec.gradYear}`;
    uniqueGradsMap.set(key, rec);
  }
  const uniqueRecords = Array.from(uniqueGradsMap.values());

  const preview = uniqueRecords.slice(0, 10).map((r) => ({
    "รหัสนักศึกษา": r.studentId,
    "ชื่อ-นามสกุล": r.fullName,
    "ระดับชั้น": r.educationLevel,
    "สาขาวิชา": r.major || "-",
    "ปีการศึกษา": r.gradYear,
    "สถานะ": r.trackingStatus || "-",
    "สถานประกอบการ": r.companyName || "-",
    "ตำแหน่งงาน": r.jobPosition || "-",
    "ตรงสาย": r.jobMajorMatch || "-",
    "ช่วงเงินเดือน": r.salaryRange || "-",
  }));

  return { records: uniqueRecords, preview, totalRows: uniqueRecords.length };
}
