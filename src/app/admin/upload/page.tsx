"use client";

import { useState, useEffect } from "react";
import {
  UploadCloud,
  Database,
  History,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  Trash2,
  Clock,
  FileSpreadsheet,
  AlertTriangle,
  Timer
} from "lucide-react";
import Link from "next/link";
import FileUploader from "@/components/FileUploader";
import { formatDateTime, formatDuration } from "@/lib/utils";

interface UploadLogItem {
  id: string;
  fileName: string;
  fileType: string;
  fileSize?: string;
  recordCount: number;
  durationMs?: number;
  status: string;
  message?: string;
  uploadedBy?: string;
  createdAt: string;
}

export default function AdminUploadPage() {
  const [dataInfo, setDataInfo] = useState<{
    counts: { profileCount: number; graduateCount: number };
    logs: UploadLogItem[];
  }>({
    counts: { profileCount: 0, graduateCount: 0 },
    logs: [],
  });
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteLog, setConfirmDeleteLog] = useState<UploadLogItem | null>(null);
  const [confirmClearType, setConfirmClearType] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchDataInfo = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/logs");
      const json = await res.json();
      if (json.success) {
        setDataInfo({
          counts: json.counts || { profileCount: 0, graduateCount: 0 },
          logs: json.logs || [],
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDataInfo();
  }, []);

  // Delete specific uploaded file
  const handleDeleteLog = async (log: UploadLogItem) => {
    try {
      setDeletingId(log.id);
      setStatusMessage(null);
      const res = await fetch(`/api/admin/logs?id=${log.id}&deleteData=true`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        setStatusMessage({ type: "success", text: json.message });
        setConfirmDeleteLog(null);
        fetchDataInfo();
      } else {
        setStatusMessage({ type: "error", text: json.error || "ลบไฟล์ไม่สำเร็จ" });
      }
    } catch (e: any) {
      setStatusMessage({ type: "error", text: e.message || "เกิดข้อผิดพลาดในการลบไฟล์" });
    } finally {
      setDeletingId(null);
    }
  };

  // Clear all data by category or all
  const handleClearData = async (clearType: string) => {
    try {
      setStatusMessage(null);
      const res = await fetch(`/api/admin/logs?clearType=${clearType}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        setStatusMessage({ type: "success", text: json.message });
        setConfirmClearType(null);
        fetchDataInfo();
      } else {
        setStatusMessage({ type: "error", text: json.error || "ล้างข้อมูลไม่สำเร็จ" });
      }
    } catch (e: any) {
      setStatusMessage({ type: "error", text: e.message || "เกิดข้อผิดพลาด" });
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> กลับหน้าแดชบอร์ด
            </Link>
            <span className="text-xs text-slate-300">•</span>
            <span className="text-xs text-slate-500 font-semibold">Admin Panel</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-1 tracking-tight">
            นำเข้า ลบ และจัดการไฟล์ข้อมูล Excel
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            อัปโหลด ลบไฟล์ หรือล้างข้อมูลในระบบ พร้อมบันทึกเวลาอัปโหลดและเวลาประมวลผลอย่างละเอียด
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchDataInfo}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            รีเฟรช
          </button>
        </div>
      </div>

      {/* Status Alert */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl text-xs flex items-start gap-3 animate-fade-in ${
            statusMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <div className="font-medium">{statusMessage.text}</div>
        </div>
      )}

      {/* Current DB Counts Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500">ข้อมูลสถานะการปรับปรุงในระบบ</span>
              <div className="text-2xl font-extrabold text-slate-900">
                {dataInfo.counts.profileCount.toLocaleString()} <span className="text-sm font-normal text-slate-400">รายการ</span>
              </div>
            </div>
          </div>
          {dataInfo.counts.profileCount > 0 && (
            <button
              onClick={() => setConfirmClearType("profile_status")}
              className="text-xs text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl font-medium transition"
              title="ล้างข้อมูลสถานะการปรับปรุงทั้งหมด"
            >
              ล้างหมวดนี้
            </button>
          )}
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500">ข้อมูลการติดตามผู้สำเร็จการศึกษาในระบบ</span>
              <div className="text-2xl font-extrabold text-slate-900">
                {dataInfo.counts.graduateCount.toLocaleString()} <span className="text-sm font-normal text-slate-400">รายการ</span>
              </div>
            </div>
          </div>
          {dataInfo.counts.graduateCount > 0 && (
            <button
              onClick={() => setConfirmClearType("graduate_tracking")}
              className="text-xs text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl font-medium transition"
              title="ล้างข้อมูลการติดตามทั้งหมด"
            >
              ล้างหมวดนี้
            </button>
          )}
        </div>
      </div>

      {/* Main File Uploader */}
      <FileUploader onUploadSuccess={fetchDataInfo} />

      {/* Upload History & Deletion Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-800">ประวัติและรายการไฟล์ที่อัปโหลด</h3>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">แสดง {dataInfo.logs.length} รายการล่าสุด</span>
            {dataInfo.logs.length > 0 && (
              <button
                onClick={() => setConfirmClearType("all")}
                className="text-xs text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> ล้างข้อมูลทั้งหมดในระบบ
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3.5">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    วัน/เวลาที่อัปโหลด
                  </div>
                </th>
                <th className="px-4 py-3.5">ชื่อไฟล์</th>
                <th className="px-4 py-3.5">ประเภทข้อมูล</th>
                <th className="px-4 py-3.5 text-center">ขนาดไฟล์</th>
                <th className="px-4 py-3.5 text-center">จำนวนข้อมูล</th>
                <th className="px-4 py-3.5 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Timer className="w-3.5 h-3.5 text-slate-400" />
                    เวลาประมวลผล
                  </div>
                </th>
                <th className="px-4 py-3.5 text-center">สถานะ</th>
                <th className="px-4 py-3.5 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dataInfo.logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                    ยังไม่มีประวัติการอัปโหลดไฟล์ในระบบ
                  </td>
                </tr>
              ) : (
                dataInfo.logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition">
                    {/* Timestamp */}
                    <td className="px-4 py-3.5 font-mono text-slate-600 font-medium whitespace-nowrap">
                      {formatDateTime(log.createdAt)}
                    </td>

                    {/* File Name */}
                    <td className="px-4 py-3.5 font-semibold text-slate-900">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="truncate max-w-[200px]" title={log.fileName}>
                          {log.fileName}
                        </span>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3.5">
                      <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                        {log.fileType === "profile_status" ? "สถานะการปรับปรุง" : "สรุปผลการติดตาม"}
                      </span>
                    </td>

                    {/* File Size */}
                    <td className="px-4 py-3.5 text-center text-slate-500 font-mono text-[11px]">
                      {log.fileSize || "-"}
                    </td>

                    {/* Record Count */}
                    <td className="px-4 py-3.5 text-center font-bold text-indigo-600">
                      {log.recordCount.toLocaleString()} แถว
                    </td>

                    {/* Duration */}
                    <td className="px-4 py-3.5 text-center font-mono text-[11px] text-slate-600">
                      {log.durationMs ? formatDuration(log.durationMs) : "-"}
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-3.5 text-center">
                      {log.status === "SUCCESS" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" /> สำเร็จ
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          <AlertCircle className="w-3 h-3 text-rose-500" /> ไม่สำเร็จ
                        </span>
                      )}
                    </td>

                    {/* Delete Action Button */}
                    <td className="px-4 py-3.5 text-center">
                      <button
                        onClick={() => setConfirmDeleteLog(log)}
                        disabled={deletingId === log.id}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        title="ลบไฟล์และข้อมูลที่นำเข้านี้"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal for Single File Deletion */}
      {confirmDeleteLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">ยืนยันการลบไฟล์และข้อมูล</h3>
                <p className="text-xs text-slate-500">การดำเนินการนี้ไม่สามารถยกเลิกได้</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl text-xs space-y-1.5 border border-slate-100">
              <div>
                <span className="text-slate-500">ชื่อไฟล์: </span>
                <span className="font-bold text-slate-800">{confirmDeleteLog.fileName}</span>
              </div>
              <div>
                <span className="text-slate-500">ประเภท: </span>
                <span className="font-semibold text-indigo-600">
                  {confirmDeleteLog.fileType === "profile_status"
                    ? "สถานะการปรับปรุงข้อมูลนักเรียน"
                    : "สรุปผลการติดตามผู้สำเร็จการศึกษา"}
                </span>
              </div>
              <div>
                <span className="text-slate-500">จำนวนข้อมูลที่จะถูกลบ: </span>
                <span className="font-bold text-rose-600">
                  {confirmDeleteLog.recordCount.toLocaleString()} รายการ
                </span>
              </div>
              <div>
                <span className="text-slate-500">เวลาที่อัปโหลด: </span>
                <span className="font-mono text-slate-700">{formatDateTime(confirmDeleteLog.createdAt)}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteLog(null)}
                disabled={Boolean(deletingId)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => handleDeleteLog(confirmDeleteLog)}
                disabled={Boolean(deletingId)}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md transition active:scale-95 disabled:opacity-50"
              >
                {deletingId ? "กำลังลบ..." : "ยืนยันการลบข้อมูล"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Clear All Data */}
      {confirmClearType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  {confirmClearType === "all"
                    ? "ยืนยันการล้างข้อมูลทั้งหมดในระบบ"
                    : confirmClearType === "profile_status"
                    ? "ล้างข้อมูลสถานะการปรับปรุงทั้งหมด"
                    : "ล้างข้อมูลการติดตามผู้สำเร็จการศึกษาทั้งหมด"}
                </h3>
                <p className="text-xs text-rose-600 font-semibold">ข้อมูลทั้งหมดในหมวดนี้จะถูกลบออกจากฐานข้อมูล</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              หากต้องการนำข้อมูลกลับมาใหม่ คุณสามารถใช้ปุ่ม{" "}
              <span className="font-semibold text-indigo-600">โหลดข้อมูลต้นฉบับ (One-Click Seed)</span> หรือลากวางไฟล์ Excel เพื่ออัปโหลดใหม่ได้ตลอดเวลา
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmClearType(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => handleClearData(confirmClearType)}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md transition active:scale-95"
              >
                ยืนยันการล้างข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
