"use client";

import { useState, useRef } from "react";
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle, UserCheck, Briefcase } from "lucide-react";
import DataPreviewModal from "./DataPreviewModal";

export default function FileUploader({ onUploadSuccess }: { onUploadSuccess?: () => void }) {
  // Separate file states for the two categories
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [gradFile, setGradFile] = useState<File | null>(null);

  const [draggingType, setDraggingType] = useState<"profile_status" | "graduate_tracking" | null>(null);
  const [activeType, setActiveType] = useState<"profile_status" | "graduate_tracking">("profile_status");
  const [isLoadingPreview, setIsLoadingPreview] = useState<"profile_status" | "graduate_tracking" | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [previewData, setPreviewData] = useState<any[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    category: "profile_status" | "graduate_tracking";
    type: "success" | "error";
    text: string;
  } | null>(null);

  const profileInputRef = useRef<HTMLInputElement>(null);
  const gradInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelected = (
    category: "profile_status" | "graduate_tracking",
    selectedFile: File
  ) => {
    setStatusMessage(null);
    if (category === "profile_status") {
      setProfileFile(selectedFile);
    } else {
      setGradFile(selectedFile);
    }
  };

  // Preview Action for a specific category
  const handlePreview = async (category: "profile_status" | "graduate_tracking") => {
    const targetFile = category === "profile_status" ? profileFile : gradFile;
    if (!targetFile) {
      setStatusMessage({
        category,
        type: "error",
        text: "กรุณาเลือกไฟล์ Excel ก่อนกดพรีวิว",
      });
      return;
    }

    try {
      setActiveType(category);
      setIsLoadingPreview(category);
      setStatusMessage(null);
      const formData = new FormData();
      formData.append("file", targetFile);
      formData.append("type", category);
      formData.append("previewOnly", "true");

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setPreviewData(data.preview || []);
        setTotalRows(data.totalRows || 0);
        setPreviewOpen(true);
      } else {
        setStatusMessage({
          category,
          type: "error",
          text: data.error || "เกิดข้อผิดพลาดในการพรีวิวไฟล์",
        });
      }
    } catch (err: any) {
      setStatusMessage({
        category,
        type: "error",
        text: err.message || "ไม่สามารถติดต่อเซิร์ฟเวอร์ได้",
      });
    } finally {
      setIsLoadingPreview(null);
    }
  };

  // Confirm Import Action
  const handleConfirmImport = async () => {
    const targetFile = activeType === "profile_status" ? profileFile : gradFile;
    if (!targetFile) return;

    try {
      setIsSaving(true);
      const formData = new FormData();
      formData.append("file", targetFile);
      formData.append("type", activeType);
      formData.append("previewOnly", "false");

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setPreviewOpen(false);
        if (activeType === "profile_status") {
          setProfileFile(null);
        } else {
          setGradFile(null);
        }
        const now = new Date();
        const timeStr = `${now.toLocaleTimeString("th-TH")}`;
        const durationText = data.durationMs
          ? ` • ใช้เวลา: ${(data.durationMs / 1000).toFixed(2)} วินาที`
          : "";
        setStatusMessage({
          category: activeType,
          type: "success",
          text: `${data.message} (เวลา ${timeStr} น.${durationText})`,
        });
        if (onUploadSuccess) onUploadSuccess();
      } else {
        setStatusMessage({
          category: activeType,
          type: "error",
          text: data.error || "บันทึกข้อมูลไม่สำเร็จ",
        });
      }
    } catch (err: any) {
      setStatusMessage({
        category: activeType,
        type: "error",
        text: err.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const activeFile = activeType === "profile_status" ? profileFile : gradFile;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ============================================================
            BOX 1: ไฟล์สถานะการปรับปรุงข้อมูลนักเรียน นักศึกษา
        ============================================================ */}
        <div className="bg-white rounded-2xl p-6 border-2 border-emerald-100 shadow-sm flex flex-col justify-between space-y-5">
          <div>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-1">
                  หมวดที่ 1 • แยกอัปโหลดเฉพาะข้อมูลนักศึกษา
                </span>
                <h3 className="text-base font-extrabold text-slate-900">
                  ไฟล์สถานะการปรับปรุงข้อมูลนักเรียน นักศึกษา
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  สำหรับอัปเดตข้อมูลความสมบูรณ์ 100% / ต่ำกว่า 100%, ระดับชั้น (ปวช./ปวส./ป.ตรี) และสาขาวิชา
                </p>
              </div>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDraggingType("profile_status");
              }}
              onDragLeave={() => setDraggingType(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDraggingType(null);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileSelected("profile_status", e.dataTransfer.files[0]);
                }
              }}
              onClick={() => profileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition duration-200 flex flex-col items-center justify-center min-h-[170px] ${
                draggingType === "profile_status"
                  ? "border-emerald-500 bg-emerald-50/70 scale-[0.99]"
                  : profileFile
                  ? "border-emerald-400 bg-emerald-50/30"
                  : "border-slate-300 hover:border-emerald-400 bg-slate-50/50 hover:bg-emerald-50/20"
              }`}
            >
              <input
                ref={profileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) =>
                  e.target.files?.[0] &&
                  handleFileSelected("profile_status", e.target.files[0])
                }
                className="hidden"
              />

              {profileFile ? (
                <div className="flex flex-col items-center animate-fade-in">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <p className="font-bold text-slate-800 text-sm">{profileFile.name}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    ขนาด: {(profileFile.size / 1024).toFixed(1)} KB • คลิกเพื่อเปลี่ยนไฟล์
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <p className="font-bold text-slate-800 text-sm">
                    เลือกหรือลากไฟล์ <span className="text-emerald-600 underline">สถานะการปรับปรุงข้อมูล</span> มาวางที่นี่
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    รองรับไฟล์ .xlsx, .xls, .csv
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => handlePreview("profile_status")}
              disabled={!profileFile || isLoadingPreview === "profile_status"}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md hover:shadow-lg transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoadingPreview === "profile_status" ? (
                <>
                  <span className="animate-spin">⏳</span>
                  กำลังประมวลผลพรีวิว...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4" />
                  ตรวจสอบและอัปโหลดไฟล์สถานะการปรับปรุงข้อมูล
                </>
              )}
            </button>

            {statusMessage && statusMessage.category === "profile_status" && (
              <div
                className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
                  statusMessage.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}
              >
                {statusMessage.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="font-medium">{statusMessage.text}</div>
              </div>
            )}
          </div>
        </div>

        {/* ============================================================
            BOX 2: ไฟล์สรุปผลการติดตามผู้สำเร็จการศึกษา
        ============================================================ */}
        <div className="bg-white rounded-2xl p-6 border-2 border-indigo-100 shadow-sm flex flex-col justify-between space-y-5">
          <div>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Briefcase className="w-6 h-6" />
              </div>
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 mb-1">
                  หมวดที่ 2 • แยกอัปโหลดเฉพาะข้อมูลผู้สำเร็จการศึกษา
                </span>
                <h3 className="text-base font-extrabold text-slate-900">
                  ไฟล์สรุปผลการติดตามผู้สำเร็จการศึกษา
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  สำหรับอัปเดตข้อมูลภาวะการมีงานทำ, ทำงานตรงสาขาวิชา, ศึกษาต่อ, การว่างงาน และสถานประกอบการ
                </p>
              </div>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDraggingType("graduate_tracking");
              }}
              onDragLeave={() => setDraggingType(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDraggingType(null);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileSelected("graduate_tracking", e.dataTransfer.files[0]);
                }
              }}
              onClick={() => gradInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition duration-200 flex flex-col items-center justify-center min-h-[170px] ${
                draggingType === "graduate_tracking"
                  ? "border-indigo-500 bg-indigo-50/70 scale-[0.99]"
                  : gradFile
                  ? "border-indigo-400 bg-indigo-50/30"
                  : "border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/20"
              }`}
            >
              <input
                ref={gradInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) =>
                  e.target.files?.[0] &&
                  handleFileSelected("graduate_tracking", e.target.files[0])
                }
                className="hidden"
              />

              {gradFile ? (
                <div className="flex flex-col items-center animate-fade-in">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-2">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <p className="font-bold text-slate-800 text-sm">{gradFile.name}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    ขนาด: {(gradFile.size / 1024).toFixed(1)} KB • คลิกเพื่อเปลี่ยนไฟล์
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <p className="font-bold text-slate-800 text-sm">
                    เลือกหรือลากไฟล์ <span className="text-indigo-600 underline">สรุปผลการติดตามผู้สำเร็จการศึกษา</span> มาวางที่นี่
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    รองรับไฟล์ .xlsx, .xls, .csv
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => handlePreview("graduate_tracking")}
              disabled={!gradFile || isLoadingPreview === "graduate_tracking"}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md hover:shadow-lg transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoadingPreview === "graduate_tracking" ? (
                <>
                  <span className="animate-spin">⏳</span>
                  กำลังประมวลผลพรีวิว...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4" />
                  ตรวจสอบและอัปโหลดไฟล์ติดตามผู้สำเร็จการศึกษา
                </>
              )}
            </button>

            {statusMessage && statusMessage.category === "graduate_tracking" && (
              <div
                className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
                  statusMessage.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}
              >
                {statusMessage.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="font-medium">{statusMessage.text}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      <DataPreviewModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        onConfirm={handleConfirmImport}
        previewData={previewData}
        totalRows={totalRows}
        fileName={activeFile?.name || "Excel_File"}
        fileType={activeType}
        isSaving={isSaving}
      />
    </div>
  );
}
