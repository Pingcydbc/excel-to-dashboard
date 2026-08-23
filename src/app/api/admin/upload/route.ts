import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseProfileStatusExcel, parseGraduateTrackingExcel } from "@/lib/excel-parser";

export const dynamic = "force-dynamic";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string; // 'profile_status' | 'graduate_tracking'
    const previewOnly = formData.get("previewOnly") === "true";

    if (!file) {
      return NextResponse.json(
        { success: false, error: "ไม่พบไฟล์ที่อัปโหลด กรุณาเลือกไฟล์ Excel (.xlsx, .xls หรือ .csv)" },
        { status: 400 }
      );
    }

    if (!type || (type !== "profile_status" && type !== "graduate_tracking")) {
      return NextResponse.json(
        { success: false, error: "กรุณาระบุประเภทของไฟล์ (สถานะการปรับปรุงข้อมูล หรือ สรุปผลการติดตาม)" },
        { status: 400 }
      );
    }

    const fileSizeStr = formatBytes(file.size);
    const buffer = Buffer.from(await file.arrayBuffer());

    if (type === "profile_status") {
      const { records, preview, totalRows } = parseProfileStatusExcel(buffer);

      if (previewOnly) {
        return NextResponse.json({
          success: true,
          preview,
          totalRows,
          fileName: file.name,
          fileSize: fileSizeStr,
          fileType: type,
        });
      }

      if (records.length === 0) {
        return NextResponse.json(
          { success: false, error: "ไม่พบข้อมูลที่ถูกต้องในไฟล์ หรือรูปแบบหัวตารางไม่ตรงกับที่กำหนด" },
          { status: 400 }
        );
      }

      // Create Upload Log
      const uploadLog = await prisma.uploadLog.create({
        data: {
          fileName: file.name,
          fileType: type,
          fileSize: fileSizeStr,
          recordCount: records.length,
          status: "SUCCESS",
          message: `กำลังนำเข้าข้อมูลนักเรียน ${records.length} รายการ`,
          uploadedBy: "ผู้ดูแลระบบ (Admin)",
        },
      });

      // Upsert in batches of 250 for speed
      let savedCount = 0;
      const chunkSize = 250;
      for (let i = 0; i < records.length; i += chunkSize) {
        const chunk = records.slice(i, i + chunkSize);
        await Promise.all(
          chunk.map((item) =>
            prisma.studentProfileStatus.upsert({
              where: { studentId: item.studentId },
              update: { ...item, uploadLogId: uploadLog.id },
              create: { ...item, uploadLogId: uploadLog.id },
            })
          )
        );
        savedCount += chunk.length;
      }

      const durationMs = Date.now() - startTime;
      await prisma.uploadLog.update({
        where: { id: uploadLog.id },
        data: {
          recordCount: savedCount,
          durationMs,
          message: `นำเข้าข้อมูลสถานะการปรับปรุงสำเร็จ ${savedCount} รายการ (ใช้เวลา ${(durationMs / 1000).toFixed(2)} วินาที)`,
        },
      });

      return NextResponse.json({
        success: true,
        message: `นำเข้าข้อมูลนักเรียนสำเร็จ ${savedCount} รายการ (ใช้เวลา ${(durationMs / 1000).toFixed(2)} วินาที)`,
        savedCount,
        totalRows,
        durationMs,
        uploadLogId: uploadLog.id,
      });
    } else {
      const { records, preview, totalRows } = parseGraduateTrackingExcel(buffer);

      if (previewOnly) {
        return NextResponse.json({
          success: true,
          preview,
          totalRows,
          fileName: file.name,
          fileSize: fileSizeStr,
          fileType: type,
        });
      }

      if (records.length === 0) {
        return NextResponse.json(
          { success: false, error: "ไม่พบข้อมูลผู้สำเร็จการศึกษาในไฟล์ หรือรูปแบบหัวตารางไม่ตรง" },
          { status: 400 }
        );
      }

      const uploadLog = await prisma.uploadLog.create({
        data: {
          fileName: file.name,
          fileType: type,
          fileSize: fileSizeStr,
          recordCount: records.length,
          status: "SUCCESS",
          message: `กำลังนำเข้าข้อมูลผู้สำเร็จการศึกษา ${records.length} รายการ`,
          uploadedBy: "ผู้ดูแลระบบ (Admin)",
        },
      });

      let savedCount = 0;
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
              update: {
                ...item,
                uploadLogId: uploadLog.id,
              },
              create: {
                ...item,
                uploadLogId: uploadLog.id,
              },
            })
          )
        );
        savedCount += chunk.length;
      }

      const durationMs = Date.now() - startTime;
      await prisma.uploadLog.update({
        where: { id: uploadLog.id },
        data: {
          recordCount: savedCount,
          durationMs,
          message: `นำเข้าข้อมูลผู้สำเร็จการศึกษาสำเร็จ ${savedCount} รายการ (ใช้เวลา ${(durationMs / 1000).toFixed(2)} วินาที)`,
        },
      });

      return NextResponse.json({
        success: true,
        message: `นำเข้าข้อมูลผู้สำเร็จการศึกษาสำเร็จ ${savedCount} รายการ (ใช้เวลา ${(durationMs / 1000).toFixed(2)} วินาที)`,
        savedCount,
        totalRows,
        durationMs,
        uploadLogId: uploadLog.id,
      });
    }
  } catch (error: any) {
    console.error("Upload API error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "เกิดข้อผิดพลาดในการประมวลผลไฟล์" },
      { status: 500 }
    );
  }
}
