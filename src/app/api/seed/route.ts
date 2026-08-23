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
      const chunkSize = 250;
      for (let i = 0; i < records.length; i += chunkSize) {
        const chunk = records.slice(i, i + chunkSize);
        await Promise.all(
          chunk.map((item) =>
            prisma.studentProfileStatus.upsert({
              where: { studentId: item.studentId },
              update: item,
              create: item,
            })
          )
        );
        profileImported += chunk.length;
      }
    }

    if (fs.existsSync(graduateFile)) {
      const buf = fs.readFileSync(graduateFile);
      const { records } = parseGraduateTrackingExcel(buf);
      const chunkSize = 250;
      for (let i = 0; i < records.length; i += chunkSize) {
        const chunk = records.slice(i, i + chunkSize);
        await Promise.all(
          chunk.map((item) =>
            prisma.graduateTracking.upsert({
              where: {
                studentId_gradYear: {
                  studentId: item.studentId,
                  gradYear: item.gradYear,
                },
              },
              update: item,
              create: item,
            })
          )
        );
        graduateImported += chunk.length;
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
