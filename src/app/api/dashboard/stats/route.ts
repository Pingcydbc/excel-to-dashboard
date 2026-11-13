import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { filterByDefaultCohort, matchesMajorFilter } from "@/lib/utils";
import { parseProfileStatusExcel } from "@/lib/excel-parser";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

let hasAutoRestoredProfileData = false;

function matchesLevelFilter(educationLevel: string | null | undefined, levelParam: string): boolean {
  if (!levelParam || levelParam === "all") return true;
  const lv = String(educationLevel || "");
  if (levelParam.includes("ตรี") || levelParam.includes("ปริญญา")) {
    return lv.includes("ป.ตรี") || lv.includes("ปริญญา") || lv.includes("ทล.บ.");
  }
  return lv.includes(levelParam);
}

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  try {
    const { searchParams } = new URL(req.url);
    const yearParam = searchParams.get("year") || "all";
    const levelParam = searchParams.get("level") || "all";
    const majorParam = searchParams.get("major") || "all";

    // Auto-clean any accidental upload of a Graduate Tracking file into profile_status
    const wrongProfileLogs = await prisma.uploadLog.findMany({
      where: {
        fileType: "profile_status",
        fileName: { contains: "GraduatedStudentJobTracking" },
      },
      select: { id: true },
    });
    if (wrongProfileLogs.length > 0) {
      const wrongIds = wrongProfileLogs.map((l) => l.id);
      await prisma.studentProfileStatus.deleteMany({
        where: { uploadLogId: { in: wrongIds } },
      });
      await prisma.uploadLog.deleteMany({
        where: { id: { in: wrongIds } },
      });
    }

    // Auto-import local SchoolStudentList file once if StudentProfileStatus is empty
    if (!hasAutoRestoredProfileData) {
      const existingCount = await prisma.studentProfileStatus.count();
      if (existingCount === 0) {
        const candidatePaths = [
          "D:/excel_file/New folder/SchoolStudentList_Report2026_11_12_08-24-44_.xls",
          "D:/excel_file/SchoolStudentList_Report2026_09_25_03-51-15_.xls",
        ];
        for (const p of candidatePaths) {
          if (fs.existsSync(p)) {
            hasAutoRestoredProfileData = true;
            const buf = fs.readFileSync(p);
            const { records } = parseProfileStatusExcel(buf);
            if (records.length > 0) {
              const log = await prisma.uploadLog.create({
                data: {
                  fileName: path.basename(p),
                  fileType: "profile_status",
                  fileSize: `${(buf.length / (1024 * 1024)).toFixed(2)} MB`,
                  recordCount: records.length,
                  durationMs: 450,
                  status: "SUCCESS",
                  message: `นำเข้าข้อมูลสถานะการปรับปรุงสำเร็จ ${records.length} รายการ`,
                  uploadedBy: "ผู้ดูแลระบบ (Admin)",
                },
              });
              const chunkSize = 2000;
              for (let i = 0; i < records.length; i += chunkSize) {
                const chunk = records.slice(i, i + chunkSize);
                await prisma.studentProfileStatus.createMany({
                  data: chunk.map((item) => ({
                    ...item,
                    uploadLogId: log.id,
                  })),
                  skipDuplicates: true,
                });
              }
            }
            break;
          }
        }
      } else {
        hasAutoRestoredProfileData = true;
      }
    }

    // Fetch lightweight rows from both tables + latest upload log in parallel
    const [allProfilesRaw, allGraduatesRaw, latestUploadLog] = await Promise.all([
      prisma.studentProfileStatus.findMany({
        select: {
          studentId: true,
          educationLevel: true,
          major: true,
          completeness: true,
        },
      }),
      prisma.graduateTracking.findMany({
        select: {
          studentId: true,
          educationLevel: true,
          major: true,
          gradYear: true,
          trackingStatus: true,
          jobMajorMatch: true,
          salaryRange: true,
          companyName: true,
          jobPosition: true,
        },
      }),
      prisma.uploadLog.findFirst({
        where: { status: "SUCCESS" },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true, fileName: true },
      }),
    ]);

    // 1. Apply Default Cohort Filter (Item 13):
    // ปวช.: ย้อนหลัง 2 ปี, ปวส.: ย้อนหลัง 1 ปี, ป.ตรี: ย้อนหลัง 1 ปี (อิงตามปีตั้งต้นในไฟล์ Excel)
    const { filtered: cohortProfiles, baseYearPrefix: profileBaseYear } =
      filterByDefaultCohort(allProfilesRaw);
    const { filtered: cohortGraduates, baseYearPrefix: gradBaseYear } =
      filterByDefaultCohort(allGraduatesRaw);

    // Collect available filter options from cohort-filtered data
    const profileMajors = Array.from(
      new Set(cohortProfiles.map((p) => p.major?.trim()).filter(Boolean))
    ) as string[];
    const gradMajors = Array.from(
      new Set(cohortGraduates.map((g) => g.major?.trim()).filter(Boolean))
    ) as string[];
    const availableYears = Array.from(
      new Set(cohortGraduates.map((g) => g.gradYear).filter(Boolean))
    ).sort((a, b) => b - a);

    // 2. Apply user-selected UI filters (level, major, year)
    const filteredProfiles = cohortProfiles.filter(
      (p) =>
        matchesLevelFilter(p.educationLevel, levelParam) &&
        matchesMajorFilter(p.major, majorParam)
    );

    const parsedYear = yearParam !== "all" ? parseInt(yearParam, 10) : NaN;
    const filteredGraduates = cohortGraduates.filter((g) => {
      if (!isNaN(parsedYear) && g.gradYear !== parsedYear) return false;
      if (!matchesLevelFilter(g.educationLevel, levelParam)) return false;
      if (!matchesMajorFilter(g.major, majorParam)) return false;
      return true;
    });

    // 3. Compute Pillar 1: Profile Completeness Stats
    const totalStudents = filteredProfiles.length;
    let full100Students = 0;
    let below100Students = 0;
    let completedStudents = 0;
    let mediumStudents = 0;
    let lowStudents = 0;
    let sumCompleteness = 0;
    let t0_20 = 0;
    let t21_50 = 0;
    let t51_79 = 0;

    for (const p of filteredProfiles) {
      const c = p.completeness || 0;
      sumCompleteness += c;
      if (c >= 100) full100Students++;
      else below100Students++;

      if (c >= 80) completedStudents++;
      else if (c >= 50) mediumStudents++;
      else lowStudents++;

      if (c <= 20) t0_20++;
      else if (c <= 50) t21_50++;
      else if (c < 80) t51_79++;
    }

    const avgCompleteness =
      totalStudents > 0 ? Math.round((sumCompleteness / totalStudents) * 10) / 10 : 0;

    const profileStats = {
      totalStudents,
      full100Students,
      below100Students,
      full100Rate:
        totalStudents > 0 ? Math.round((full100Students / totalStudents) * 1000) / 10 : 0,
      below100Rate:
        totalStudents > 0 ? Math.round((below100Students / totalStudents) * 1000) / 10 : 0,
      completedStudents,
      mediumStudents,
      lowStudents,
      avgCompleteness,
      completenessRate: totalStudents > 0 ? (completedStudents / totalStudents) * 100 : 0,
      distribution: [
        { range: "0 - 20%", count: t0_20, color: "#ef4444" },
        { range: "21 - 50%", count: t21_50, color: "#f97316" },
        { range: "51 - 79%", count: t51_79, color: "#eab308" },
        { range: "80 - 100%", count: completedStudents, color: "#10b981" },
      ],
    };

    // 4. Compute Pillar 2 & 3: Graduate Employment & Company Stats
    const totalGraduates = filteredGraduates.length;
    let employedCount = 0;
    let studyCount = 0;
    let unemployedCount = 0;
    let militaryCount = 0;
    let otherStatusCount = 0;

    let jobMatchedCount = 0;
    let jobNotMatchedCount = 0;

    const salaryMap: Record<string, number> = {
      "1,000 - 9,000": 0,
      "9,001 - 15,000": 0,
      "15,001 - 20,000": 0,
      "20,001 - 30,000": 0,
      "มากกว่า 30,000": 0,
    };

    const majorMap: Record<
      string,
      { major: string; matched: number; notMatched: number; total: number }
    > = {};

    const UNSPECIFIED_COMPANY = "ประกอบอาชีพอิสระ / ไม่ระบุสถานประกอบการ";
    const companyDetailsMap = new Map<
      string,
      {
        count: number;
        positions: Map<string, number>;
        majors: Map<string, number>;
        salaries: Map<string, number>;
      }
    >();
    let unspecifiedCompanyCount = 0;

    for (const g of filteredGraduates) {
      const s = g.trackingStatus || "ว่างงาน";
      const isEmployedRow =
        s.includes("มีงานทำ") ||
        s.includes("ทำงาน") ||
        Boolean(g.companyName && g.companyName.trim() !== "" && g.companyName !== "-");

      if (s.includes("มีงานทำ") || s.includes("ทำงาน")) {
        employedCount++;
      } else if (s.includes("ศึกษาต่อ") || s.includes("เรียนต่อ")) {
        studyCount++;
      } else if (s.includes("เกณฑ์ทหาร")) {
        militaryCount++;
      } else if (s.includes("ว่างงาน")) {
        unemployedCount++;
      } else {
        otherStatusCount++;
      }

      if (isEmployedRow) {
        const m = g.jobMajorMatch || "";
        const mName = g.major || "ไม่ระบุ";
        if (!majorMap[mName]) {
          majorMap[mName] = { major: mName, matched: 0, notMatched: 0, total: 0 };
        }

        if (m.includes("ตรง") && !m.includes("ไม่ตรง")) {
          jobMatchedCount++;
          majorMap[mName].matched++;
        } else if (m.includes("ไม่ตรง")) {
          jobNotMatchedCount++;
          majorMap[mName].notMatched++;
        } else {
          majorMap[mName].notMatched++;
        }
        majorMap[mName].total++;
      }

      const sal = g.salaryRange || "";
      if (sal) {
        if (
          sal.includes("1,000") ||
          sal.includes("ต่ำกว่า") ||
          sal.includes("< 9,000")
        ) {
          salaryMap["1,000 - 9,000"]++;
        } else if (sal.includes("9,001") || sal.includes("9001")) {
          salaryMap["9,001 - 15,000"]++;
        } else if (sal.includes("15,001") || sal.includes("15001")) {
          salaryMap["15,001 - 20,000"]++;
        } else if (sal.includes("20,001") || sal.includes("20001")) {
          salaryMap["20,001 - 30,000"]++;
        } else if (sal.includes("30,000") || sal.includes("25,001") || sal.includes("มากกว่า")) {
          salaryMap["มากกว่า 30,000"]++;
        } else {
          salaryMap["9,001 - 15,000"]++;
        }
      }

      const cName = (g.companyName || "").trim();
      if (cName && cName !== "-" && cName !== UNSPECIFIED_COMPANY) {
        let entry = companyDetailsMap.get(cName);
        if (!entry) {
          entry = {
            count: 0,
            positions: new Map(),
            majors: new Map(),
            salaries: new Map(),
          };
          companyDetailsMap.set(cName, entry);
        }
        entry.count++;
        const pos = (g.jobPosition || "").trim();
        if (pos && pos !== "-" && pos !== "พนักงาน / ปฏิบัติงาน") {
          entry.positions.set(pos, (entry.positions.get(pos) || 0) + 1);
        }
        const maj = (g.major || "").trim();
        if (maj && maj !== "-") {
          entry.majors.set(maj, (entry.majors.get(maj) || 0) + 1);
        }
        if (sal && sal !== "-") {
          entry.salaries.set(sal, (entry.salaries.get(sal) || 0) + 1);
        }
      } else if (isEmployedRow) {
        unspecifiedCompanyCount++;
      }
    }

    const employmentRate = totalGraduates > 0 ? (employedCount / totalGraduates) * 100 : 0;
    const studyRate = totalGraduates > 0 ? (studyCount / totalGraduates) * 100 : 0;
    const unemploymentRate = totalGraduates > 0 ? (unemployedCount / totalGraduates) * 100 : 0;

    const statusChartData = [
      { name: "มีงานทำ", value: employedCount, color: "#10b981" },
      { name: "ศึกษาต่อ", value: studyCount, color: "#3b82f6" },
      { name: "ว่างงาน", value: unemployedCount, color: "#f43f5e" },
      { name: "เกณฑ์ทหาร/อื่นๆ", value: militaryCount + otherStatusCount, color: "#8b5cf6" },
    ].filter((d) => d.value > 0);

    const totalEmployedWithMatch = jobMatchedCount + jobNotMatchedCount;
    const matchRate =
      totalEmployedWithMatch > 0 ? (jobMatchedCount / totalEmployedWithMatch) * 100 : 0;

    const salaryChartData = Object.entries(salaryMap).map(([range, count]) => ({
      range,
      count,
    }));

    const majorMatchChartData = Object.values(majorMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);

    const pickTopKey = (m: Map<string, number>, fallback: string) => {
      if (m.size === 0) return fallback;
      return Array.from(m.entries()).sort((a, b) => b[1] - a[1])[0][0];
    };

    const sortedCompanies = Array.from(companyDetailsMap.entries()).sort(
      (a, b) => b[1].count - a[1].count
    );
    const totalUniqueCompanies = sortedCompanies.length;
    const topCompanies = sortedCompanies.slice(0, 10).map(([companyName, info]) => ({
      companyName,
      count: info.count,
      topPosition: pickTopKey(info.positions, "พนักงาน / ปฏิบัติงาน"),
      primaryMajor: pickTopKey(info.majors, "ทั่วไป"),
      sampleSalary: pickTopKey(info.salaries, "9,001 - 15,000"),
    }));

    const responseData = {
      latestUploadDate: latestUploadLog?.createdAt || null,
      cohortBaseYear: {
        profileBaseYear: profileBaseYear ? profileBaseYear + 2500 : null,
        gradBaseYear: gradBaseYear ? gradBaseYear + 2500 : null,
      },
      profileStats,
      employmentStats: {
        totalGraduates,
        employedCount,
        employmentRate: Math.round(employmentRate * 10) / 10,
        studyCount,
        studyRate: Math.round(studyRate * 10) / 10,
        unemployedCount,
        unemploymentRate: Math.round(unemploymentRate * 10) / 10,
        militaryCount,
        jobMatchedCount,
        jobNotMatchedCount,
        matchRate: Math.round(matchRate * 10) / 10,
        statusChartData,
        salaryChartData,
        majorMatchChartData,
      },
      companyStats: {
        totalUniqueCompanies,
        unspecifiedCompanyCount,
        topCompanies,
      },
      filters: {
        years: availableYears,
        profileMajors,
        gradMajors,
        majors: Array.from(new Set([...profileMajors, ...gradMajors])),
      },
    };

    return NextResponse.json(
      {
        success: true,
        data: responseData,
        cached: false,
        responseTimeMs: Date.now() - startTime,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error: any) {
    console.error("Dashboard Stats API Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
