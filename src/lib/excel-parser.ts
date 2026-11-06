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
  if (s.includes("ปริญญา") || s.includes("ทล.บ.") || s.includes("ป.ตรี")) return "ป.ตรี";
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

  // Check if this is a Graduate StudentDetail_Report file (where [0]="ชื่อ นามสกุล" and [8]="เลขรหัสนักเรียน")
  let isGraduateDetailFormat = false;
  let gradHeaderIdx = 5;
  for (let i = 0; i < Math.min(rawRows.length, 15); i++) {
    const row = rawRows[i];
    if (Array.isArray(row)) {
      const text = row.join(" ");
      if (text.includes("เลขรหัสนักเรียน") && text.includes("ชื่อ นามสกุล")) {
        isGraduateDetailFormat = true;
        gradHeaderIdx = i;
        break;
      }
    }
  }

  if (isGraduateDetailFormat) {
    const cleanDash = (val: any): string => {
      const s = cleanStr(val);
      return s === "-" ? "" : s;
    };

    const records: ParsedProfileStatusRecord[] = [];
    for (let r = gradHeaderIdx + 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || row.length === 0) continue;

      const fullName = cleanStr(row[0]);
      const studentId = cleanStr(row[8]);
      if (!fullName || !studentId || fullName === "ชื่อ นามสกุล" || fullName.includes("รวม")) continue;

      let prefix = "";
      let nameBody = fullName;
      if (nameBody.startsWith("นาย ")) {
        prefix = "นาย";
        nameBody = nameBody.substring(4).trim();
      } else if (nameBody.startsWith("นางสาว ")) {
        prefix = "นางสาว";
        nameBody = nameBody.substring(7).trim();
      } else if (nameBody.startsWith("น.ส. ")) {
        prefix = "นางสาว";
        nameBody = nameBody.substring(5).trim();
      }
      const parts = nameBody.split(/\s+/);
      const firstName = parts[0] || fullName;
      const lastName = parts.slice(1).join(" ") || "";

      const educationLevel = normalizeLevel(cleanStr(row[2]));
      const faculty = cleanDash(row[4]);
      const major = cleanDash(row[13]) || faculty;
      const minor = cleanDash(row[13]) || faculty;

      const citizenId = cleanDash(row[3]);
      const birthDate = cleanDash(row[9]);
      const email = cleanDash(row[10]);
      const phone = cleanDash(row[11]);

      const hasStudy = Boolean(cleanDash(row[16]) || cleanDash(row[17]) || cleanDash(row[18]) || cleanDash(row[19]) || cleanDash(row[20]));
      const hasWork = Boolean(cleanDash(row[21]) || cleanDash(row[22]) || cleanDash(row[23]) || cleanDash(row[24]));
      const hasDetailPlace = Boolean(cleanDash(row[17]) || cleanDash(row[21]) || cleanDash(row[22]));

      // Compute profile completeness % based on filled fields in the report
      let score = 20; // studentId + fullName + major
      if (citizenId) score += 10;
      if (birthDate) score += 5;
      if (phone) score += 10;
      if (email) score += 10;
      if (hasStudy || hasWork) {
        score += 35;
        if (hasDetailPlace) score += 10;
      }

      const completeness = Math.min(100, score);

      records.push({
        studentId,
        prefix,
        firstName,
        lastName,
        educationLevel,
        faculty,
        major,
        minor,
        lastProfileUpdate: new Date(),
        completeness,
      });
    }

    const uniqueMap = new Map<string, ParsedProfileStatusRecord>();
    for (const rec of records) {
      uniqueMap.set(rec.studentId, rec);
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

  // 1. Check if this is the Summary by Subject Type report (รายงานภาวะการมีงานทำและศึกษาต่อของผู้สำเร็จการศึกษา จำแนกตามประเภทวิชา)
  let isSummaryReport = false;
  let summaryHeaderRowIdx = -1;

  for (let i = 0; i < Math.min(rawRows.length, 15); i++) {
    const row = rawRows[i];
    if (Array.isArray(row)) {
      const text = row.join(" ");
      if (
        text.includes("จำแนกตามประเภทวิชา") ||
        (text.includes("ประเภทวิชา") && text.includes("จบการศึกษาทั้งหมด") && text.includes("สรุปการมีงานทำ"))
      ) {
        isSummaryReport = true;
        summaryHeaderRowIdx = i;
        break;
      }
    }
  }

  if (isSummaryReport) {
    let gradYear = 2568;
    let gradTerm = "2";
    for (let i = 0; i < Math.min(rawRows.length, 5); i++) {
      const text = (rawRows[i] || []).join(" ");
      const yearMatch = text.match(/\b(25\d{2}|20\d{2})\b/);
      if (yearMatch) {
        gradYear = parseInt(yearMatch[1], 10);
        if (gradYear < 2400) gradYear += 543;
      }
      if (rawRows[i] && (cleanStr(rawRows[i][0]) === "1" || cleanStr(rawRows[i][0]) === "2")) {
        gradTerm = cleanStr(rawRows[i][0]);
      }
    }

    const records: ParsedGraduateRecord[] = [];
    let counter = 1;

    for (let r = summaryHeaderRowIdx + 2; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || row.length === 0) continue;
      const faculty = cleanStr(row[0]);
      if (!faculty || faculty.includes("รวม") || faculty.includes("หมายเหตุ")) continue;

      const studyDirect = Number(row[5]) || 0;
      const studyIndirect = Number(row[6]) || 0;
      const unemployed = Number(row[7]) || 0;
      const workDirect = Number(row[9]) || 0;
      const workIndirect = Number(row[10]) || 0;
      const stateEnterprise = Number(row[11]) || 0;
      const government = Number(row[12]) || 0;
      const privateCompany = Number(row[13]) || 0;
      const freelance = Number(row[14]) || 0;
      const others = Number(row[15]) || 0;

      // 1. Further Study
      for (let i = 0; i < studyDirect; i++) {
        records.push({
          studentId: `${gradYear}G${String(counter++).padStart(5, "0")}`,
          fullName: `ผู้สำเร็จการศึกษา (${faculty})`,
          educationLevel: "ตามประเภทวิชา",
          faculty,
          major: faculty,
          gradYear,
          gradTerm,
          trackingStatus: "ศึกษาต่อ",
          studyMajorMatch: "ตรงสาย",
        });
      }
      for (let i = 0; i < studyIndirect; i++) {
        records.push({
          studentId: `${gradYear}G${String(counter++).padStart(5, "0")}`,
          fullName: `ผู้สำเร็จการศึกษา (${faculty})`,
          educationLevel: "ตามประเภทวิชา",
          faculty,
          major: faculty,
          gradYear,
          gradTerm,
          trackingStatus: "ศึกษาต่อ",
          studyMajorMatch: "ไม่ตรงสาย",
        });
      }

      // 2. Unemployed
      for (let i = 0; i < unemployed; i++) {
        records.push({
          studentId: `${gradYear}G${String(counter++).padStart(5, "0")}`,
          fullName: `ผู้สำเร็จการศึกษา (${faculty})`,
          educationLevel: "ตามประเภทวิชา",
          faculty,
          major: faculty,
          gradYear,
          gradTerm,
          trackingStatus: "ว่างงาน",
        });
      }

      // 3. Employed (จำแนกตามประเภทหน่วยงานที่มีในไฟล์: รัฐวิสาหกิจ, ราชการ, เอกชน, อาชีพอิสระ)
      const empList: { comp: string }[] = [];
      for (let i = 0; i < stateEnterprise; i++) empList.push({ comp: "รัฐวิสาหกิจ" });
      for (let i = 0; i < government; i++) empList.push({ comp: "ราชการ" });
      for (let i = 0; i < privateCompany; i++) empList.push({ comp: "เอกชน" });
      for (let i = 0; i < freelance; i++) empList.push({ comp: "ประกอบอาชีพอิสระ" });

      let directRem = workDirect;
      for (const e of empList) {
        const isDirect = directRem > 0;
        if (isDirect) directRem--;
        records.push({
          studentId: `${gradYear}G${String(counter++).padStart(5, "0")}`,
          fullName: `ผู้สำเร็จการศึกษา (${faculty})`,
          educationLevel: "ตามประเภทวิชา",
          faculty,
          major: faculty,
          gradYear,
          gradTerm,
          trackingStatus: "มีงานทำ",
          companyName: e.comp,
          jobMajorMatch: isDirect ? "ตรงสาย" : "ไม่ตรงสาย",
        });
      }

      // 4. Others
      for (let i = 0; i < others; i++) {
        records.push({
          studentId: `${gradYear}G${String(counter++).padStart(5, "0")}`,
          fullName: `ผู้สำเร็จการศึกษา (${faculty})`,
          educationLevel: "ตามประเภทวิชา",
          faculty,
          major: faculty,
          gradYear,
          gradTerm,
          trackingStatus: "อื่น ๆ",
        });
      }
    }

    const preview = records.slice(0, 10).map((r) => ({
      "รหัสนักศึกษา": r.studentId,
      "ชื่อ-นามสกุล": r.fullName,
      "ประเภทวิชา": r.faculty || "-",
      "ปีการศึกษา": r.gradYear,
      "สถานะการติดตาม": r.trackingStatus || "-",
      "ประเภทสถานที่ทำงาน": r.companyName || "-",
      "ตรงวุฒิการศึกษา": r.jobMajorMatch || r.studyMajorMatch || "-",
    }));

    return { records, preview, totalRows: records.length };
  }

  // 2. Individual Tracking Report (Standard format)
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

  // Extract default gradYear and gradTerm from report header rows (Row 1 = Year, Row 2 = Term)
  let defaultGradYear = 2568;
  let defaultGradTerm = "2";
  if (rawRows[1] && cleanStr(rawRows[1][0])) {
    const y = parseInt(cleanStr(rawRows[1][0]), 10);
    if (!isNaN(y) && y > 2000) defaultGradYear = y > 2400 ? y : y + 543;
  }
  if (rawRows[2] && cleanStr(rawRows[2][0])) {
    const t = cleanStr(rawRows[2][0]);
    if (/^[123]$/.test(t)) defaultGradTerm = t;
  }

  const cleanDash = (val: any): string => {
    const s = cleanStr(val);
    return s === "-" ? "" : s;
  };

  const records: ParsedGraduateRecord[] = [];
  const startRow = headerRowIdx + 1;

  for (let r = startRow; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.length === 0) continue;

    // [0]=fullName, [2]=level, [3]=citizenId, [4]=faculty, [6]=gradYear, [7]=gradTerm, [8]=studentId, [13]=major
    // [16]=furtherLevel, [17]=instituteName, [18]=studyMatch, [19]=studyFaculty, [20]=studyMajor
    // [21]=company, [22]=jobPosition, [23]=salary, [24]=jobMatch, [25]=trackingStatus, [26]=gradAcademicYear
    const fullName = cleanStr(row[0]);
    const studentId = cleanStr(row[8]) || `GRAD_${r}`;
    if (!fullName || fullName === "ชื่อ นามสกุล" || fullName.includes("รวม")) continue;

    const citizenId = cleanDash(row[3]) || undefined;
    const educationLevel = normalizeLevel(cleanStr(row[2]));
    const faculty = cleanDash(row[4]);
    const major = cleanDash(row[13]) || faculty;

    let gradYear = defaultGradYear;
    const rawYear = cleanStr(row[6]) || cleanStr(row[26]);
    if (rawYear) {
      const y = parseInt(rawYear, 10);
      if (!isNaN(y)) {
        gradYear = y > 2400 ? y : y + 543;
      }
    }

    const gradTerm = cleanDash(row[7]) || defaultGradTerm;

    // Study fields: [16]=ระดับที่ศึกษาต่อ, [17]=ชื่อสถานศึกษา, [18]=ตรงสาย/ไม่ตรงสาย, [19]=ประเภทวิชา/คณะ, [20]=สาขาวิชาที่เรียนต่อ
    const rawFurtherLevel = cleanDash(row[16]);
    const rawInstitute = cleanDash(row[17]);
    const rawStudyMatch = cleanDash(row[18]);
    const rawStudyFaculty = cleanDash(row[19]);
    const rawStudyMajor = cleanDash(row[20]);

    const studyMajorMatch = normalizeMatch(rawStudyMatch);
    const hasStudyInfo = Boolean(rawFurtherLevel || rawInstitute || rawStudyMatch || rawStudyFaculty || rawStudyMajor);

    // Work fields: [21]=ชื่อสถานที่ทำงาน, [22]=ตำแหน่งงาน, [23]=เงินเดือน, [24]=ทำงานตรงสาย
    const rawCompany = cleanDash(row[21]);
    const rawPosition = cleanDash(row[22]);
    const rawSalary = cleanDash(row[23]);
    const rawJobMatch = cleanDash(row[24]);

    const salaryRange = rawSalary;
    const jobMajorMatch = normalizeMatch(rawJobMatch);
    const hasWorkInfo = Boolean(rawCompany || rawPosition || rawSalary || rawJobMatch);

    let trackingStatus = cleanDash(row[25]);
    if (!trackingStatus || trackingStatus === "ตรง" || trackingStatus === "ไม่ตรง") {
      if (hasWorkInfo) {
        if (rawCompany.includes("ค่ายทหาร") || rawPosition.includes("ทหาร")) {
          trackingStatus = "เกณฑ์ทหาร";
        } else {
          trackingStatus = "มีงานทำ";
        }
      } else if (hasStudyInfo) {
        trackingStatus = "ศึกษาต่อ";
      } else {
        trackingStatus = "ว่างงาน";
      }
    }

    // Populate fallback labels when V-COP export leaves sub-columns blank
    let furtherStudyLevel = rawFurtherLevel;
    let instituteName = rawInstitute;
    if (trackingStatus === "ศึกษาต่อ") {
      if (!furtherStudyLevel) {
        if (rawStudyMajor && rawStudyFaculty && rawStudyMajor !== rawStudyFaculty) {
          furtherStudyLevel = `${rawStudyFaculty} (${rawStudyMajor})`;
        } else if (rawStudyMajor || rawStudyFaculty) {
          furtherStudyLevel = `สาขา${rawStudyMajor || rawStudyFaculty}`;
        } else {
          furtherStudyLevel = educationLevel === "ปวช." ? "ปวส. / ปริญญาตรี" : "ปริญญาตรี";
        }
      }
      if (!instituteName) {
        instituteName = rawStudyFaculty
          ? `ศึกษาต่อด้าน${rawStudyFaculty}`
          : "ศึกษาต่อ (ไม่ระบุสถานศึกษา)";
      }
    }

    let companyName = rawCompany;
    let jobPosition = rawPosition;
    if (trackingStatus === "มีงานทำ" || trackingStatus === "เกณฑ์ทหาร") {
      if (!companyName) {
        companyName = "ประกอบอาชีพอิสระ / ไม่ระบุสถานประกอบการ";
      }
      if (!jobPosition) {
        jobPosition = companyName.includes("อาชีพอิสระ")
          ? "ประกอบอาชีพอิสระ"
          : "พนักงานปฏิบัติการ";
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
