import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";
import { parseProfileStatusExcel, parseGraduateTrackingExcel } from "@/lib/excel-parser";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    let profileImported = 0;
    let graduateImported = 0;

    const profileFile = path.resolve("D:/excel_to_dashbord/รายงานสถานการปรับปรุงข้อมูลนักเรียน นักศ.xls");
    const graduateFile = path.resolve("D:/excel_to_dashbord/รายงานสรุปผลการติดตาม (รายบุคคล) ผู้สำเร็จ.xls");

    if (fs.existsSync(profileFile)) {
      const buf = fs.readFileSync(profileFile);
      const { records } = parseProfileStatusExcel(buf);
      const chunkSize = 2000;
      for (let i = 0; i < records.length; i += chunkSize) {
        const chunk = records.slice(i, i + chunkSize);
        const res = await prisma.studentProfileStatus.createMany({
          data: chunk,
          skipDuplicates: true,
        });
        profileImported += res.count;
      }
    }

    if (fs.existsSync(graduateFile)) {
      const buf = fs.readFileSync(graduateFile);
      const { records } = parseGraduateTrackingExcel(buf);
      const chunkSize = 2000;
      for (let i = 0; i < records.length; i += chunkSize) {
        const chunk = records.slice(i, i + chunkSize);
        const res = await prisma.graduateTracking.createMany({
          data: chunk,
          skipDuplicates: true,
        });
        graduateImported += res.count;
      }
    }

    return NextResponse.json({
      success: true,
      message: `โหลดข้อมูลสำเร็จ! สถานะโปรไฟล์: ${profileImported} รายการ, การติดตามผู้สำเร็จการศึกษา: ${graduateImported} รายการ`,
      profileImported,
      graduateImported,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
