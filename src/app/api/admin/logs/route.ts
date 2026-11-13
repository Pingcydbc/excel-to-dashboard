import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";
import { filterProfilesWithRms } from "@/lib/rms";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [allProfiles, graduateCount, logs] = await Promise.all([
      prisma.studentProfileStatus.findMany({
        select: {
          id: true,
          studentId: true,
          firstName: true,
          lastName: true,
          educationLevel: true,
          major: true,
          completeness: true,
        },
      }),
      prisma.graduateTracking.count(),
      prisma.uploadLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);
    const profileCount = (await filterProfilesWithRms(allProfiles)).filtered.length;

    return NextResponse.json({
      success: true,
      counts: {
        profileCount,
        graduateCount,
      },
      logs,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json(
        { success: false, error: "กรุณาเข้าสู่ระบบก่อนดำเนินการ" },
        { status: 401 }
      );
    }
    if (admin.role?.toUpperCase() !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "บัญชีระดับ Report ไม่มีสิทธิ์ลบข้อมูล" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const logId = searchParams.get("id");
    const clearType = searchParams.get("clearType"); // 'profile_status' | 'graduate_tracking' | 'all'
    const deleteAssociatedData = searchParams.get("deleteData") !== "false";

    // Scenario 1: Clear all data by category or all
    if (clearType) {
      if (clearType === "profile_status" || clearType === "all") {
        await prisma.studentProfileStatus.deleteMany({});
        await prisma.uploadLog.deleteMany({
          where: { fileType: "profile_status" },
        });
      }

      if (clearType === "graduate_tracking" || clearType === "all") {
        await prisma.graduateTracking.deleteMany({});
        await prisma.uploadLog.deleteMany({
          where: { fileType: "graduate_tracking" },
        });
      }

      const newProfileCount = await prisma.studentProfileStatus.count();
      const newGradCount = await prisma.graduateTracking.count();

      return NextResponse.json({
        success: true,
        message:
          clearType === "all"
            ? "ล้างข้อมูลทั้งหมดในระบบเรียบร้อยแล้ว"
            : clearType === "profile_status"
            ? "ล้างข้อมูลสถานะการปรับปรุงทั้งหมดเรียบร้อยแล้ว"
            : "ล้างข้อมูลการติดตามผู้สำเร็จการศึกษาทั้งหมดเรียบร้อยแล้ว",
        counts: {
          profileCount: newProfileCount,
          graduateCount: newGradCount,
        },
      });
    }

    // Scenario 2: Delete specific upload log
    if (!logId) {
      return NextResponse.json({ success: false, error: "กรุณาระบุ ID ของไฟล์ที่ต้องการลบ" }, { status: 400 });
    }

    const log = await prisma.uploadLog.findUnique({
      where: { id: logId },
    });

    if (!log) {
      return NextResponse.json({ success: false, error: "ไม่พบประวัติไฟล์ที่ต้องการลบ" }, { status: 404 });
    }

    let deletedRecords = 0;

    if (deleteAssociatedData) {
      const [profileDel, gradDel] = await Promise.all([
        prisma.studentProfileStatus.deleteMany({ where: { uploadLogId: logId } }),
        prisma.graduateTracking.deleteMany({ where: { uploadLogId: logId } }),
      ]);
      deletedRecords = Math.max(profileDel.count, gradDel.count);

      if (deletedRecords === 0) {
        if (log.fileType === "profile_status") {
          const totalLogs = await prisma.uploadLog.count({ where: { fileType: "profile_status" } });
          if (totalLogs <= 1) {
            const allRes = await prisma.studentProfileStatus.deleteMany({});
            deletedRecords = allRes.count;
          }
        } else if (log.fileType === "graduate_tracking") {
          const totalLogs = await prisma.uploadLog.count({ where: { fileType: "graduate_tracking" } });
          if (totalLogs <= 1) {
            const allRes = await prisma.graduateTracking.deleteMany({});
            deletedRecords = allRes.count;
          }
        }
      }
    }

    // Delete the log entry
    await prisma.uploadLog.delete({
      where: { id: logId },
    });

    const newProfileCount = await prisma.studentProfileStatus.count();
    const newGradCount = await prisma.graduateTracking.count();

    return NextResponse.json({
      success: true,
      message: `ลบไฟล์ "${log.fileName}" และข้อมูลที่เกี่ยวข้อง (${deletedRecords} รายการ) เรียบร้อยแล้ว`,
      deletedLogId: logId,
      deletedRecords,
      counts: {
        profileCount: newProfileCount,
        graduateCount: newGradCount,
      },
    });
  } catch (error: any) {
    console.error("Delete Log API Error:", error);
    return NextResponse.json({ success: false, error: error.message || "เกิดข้อผิดพลาดในการลบไฟล์" }, { status: 500 });
  }
}
