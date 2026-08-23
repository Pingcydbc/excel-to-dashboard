"use client";

import { useState, useRef } from "react";
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle, Sparkles, Database } from "lucide-react";
import DataPreviewModal from "./DataPreviewModal";

export default function FileUploader({ onUploadSuccess }: { onUploadSuccess?: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<"profile_status" | "graduate_tracking">("profile_status");
  const [isDragging, setIsDragging] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelected = (selectedFile: File) => {
    setStatusMessage(null);
    setFile(selectedFile);
    
    // Auto-detect file type from name
    if (selectedFile.name.includes("ติดตาม") || selectedFile.name.includes("สำเร็จ")) {
      setFileType("graduate_tracking");
    } else if (selectedFile.name.includes("ปรับปรุง") || selectedFile.name.includes("นักเรียน") || selectedFile.name.includes("นักศึกษา")) {
      setFileType("profile_status");
    }
  };

  // Preview Action
  const handlePreview = async () => {
    if (!file) {
      setStatusMessage({ type: "error", text: "กรุณาเลือกไฟล์ Excel ก่อนกดพรีวิว" });
      return;
    }

    try {
      setIsLoadingPreview(true);
      setStatusMessage(null);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", fileType);
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
        setStatusMessage({ type: "error", text: data.error || "เกิดข้อผิดพลาดในการพรีวิวไฟล์" });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "ไม่สามารถติดต่อเซิร์ฟเวอร์ได้" });
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Confirm Import Action
  const handleConfirmImport = async () => {
    if (!file) return;

    try {
      setIsSaving(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", fileType);
      formData.append("previewOnly", "false");

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setPreviewOpen(false);
        setFile(null);
        const now = new Date();
        const timeStr = `${now.toLocaleTimeString("th-TH")}`;
        const durationText = data.durationMs ? ` • ใช้เวลา: ${(data.durationMs / 1000).toFixed(2)} วินาที` : "";
        setStatusMessage({
          type: "success",
          text: `${data.message} (เวลา ${timeStr} น.${durationText})`,
        });
        if (onUploadSuccess) onUploadSuccess();
      } else {
        setStatusMessage({ type: "error", text: data.error || "บันทึกข้อมูลไม่สำเร็จ" });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล" });
    } finally {
      setIsSaving(false);
    }
  };

  // Fast Seed Button
  const handleSeedDemoData = async () => {
    try {
      setIsSeeding(true);
      setStatusMessage(null);
      const res = await fetch("/api/seed", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({ type: "success", text: data.message });
        if (onUploadSuccess) onUploadSuccess();
      } else {
        setStatusMessage({ type: "error", text: data.error || "โหลดข้อมูลไม่สำเร็จ" });
      }
    } catch (e: any) {
      setStatusMessage({ type: "error", text: e.message || "เกิดข้อผิดพลาด" });
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* File Type Selector */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-3">1. เลือกประเภทข้อมูลที่ต้องการนำเข้า</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label
            className={`flex items-start gap-3.5 p-4 rounded-2xl border-2 cursor-pointer transition ${
              fileType === "profile_status"
                ? "border-indigo-600 bg-indigo-50/50 shadow-sm"
                : "border-slate-200 hover:border-slate-300 bg-white"
            }`}
          >
            <input
              type="radio"
              name="fileType"
              checked={fileType === "profile_status"}
              onChange={() => setFileType("profile_status")}
              className="mt-1 text-indigo-600 focus:ring-indigo-500"
            />
            <div>
              <div className="font-bold text-slate-900 text-sm">
                ไฟล์สถานะการปรับปรุงข้อมูลนักเรียน นักศึกษา
              </div>
              <p className="text-xs text-slate-500 mt-1">
                รายงานความสมบูรณ์โปรไฟล์ (Completeness %), ระดับชั้น (ปวช./ปวส.), สาขาวิชา, วันที่อัปเดตล่าสุด
              </p>
            </div>
          </label>

          <label
            className={`flex items-start gap-3.5 p-4 rounded-2xl border-2 cursor-pointer transition ${
              fileType === "graduate_tracking"
                ? "border-indigo-600 bg-indigo-50/50 shadow-sm"
                : "border-slate-200 hover:border-slate-300 bg-white"
            }`}
          >
            <input
              type="radio"
              name="fileType"
              checked={fileType === "graduate_tracking"}
              onChange={() => setFileType("graduate_tracking")}
              className="mt-1 text-indigo-600 focus:ring-indigo-500"
            />
            <div>
              <div className="font-bold text-slate-900 text-sm">
                ไฟล์สรุปผลการติดตามผู้สำเร็จการศึกษา
              </div>
              <p className="text-xs text-slate-500 mt-1">
                รายงานสถานะมีงานทำ/ศึกษาต่อ, สถานประกอบการ, ตำแหน่ง, การตรงสาย, ฐานเงินเดือน, ปีการศึกษา
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Drag & Drop Area */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-3">2. ลากและวาง หรือเลือกไฟล์ Excel</h3>
        
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition duration-200 flex flex-col items-center justify-center ${
            isDragging
              ? "border-indigo-500 bg-indigo-50/70 scale-[0.99]"
              : file
              ? "border-emerald-400 bg-emerald-50/30"
              : "border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/20"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => e.target.files?.[0] && handleFileSelected(e.target.files[0])}
            className="hidden"
          />

          {file ? (
            <div className="flex flex-col items-center animate-fade-in">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
                <FileSpreadsheet className="w-7 h-7" />
              </div>
              <p className="font-bold text-slate-800 text-base">{file.name}</p>
              <p className="text-xs text-slate-500 mt-1">
                ขนาด: {(file.size / 1024).toFixed(1)} KB • คลิกเพื่อเปลี่ยนไฟล์
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 shadow-inner">
                <UploadCloud className="w-7 h-7" />
              </div>
              <p className="font-bold text-slate-800 text-base">
                ลากไฟล์มาวางที่นี่ หรือ <span className="text-indigo-600 underline">คลิกเพื่อเลือกไฟล์</span>
              </p>
              <p className="text-xs text-slate-400 mt-1.5">
                รองรับไฟล์นามสกุล .xlsx, .xls และ .csv จากระบบ ศธ.02 หรือระบบอาชีวศึกษา
              </p>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            type="button"
            onClick={handlePreview}
            disabled={!file || isLoadingPreview}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md hover:shadow-lg transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoadingPreview ? (
              <>
                <span className="animate-spin">⏳</span>
                กำลังประมวลผลพรีวิว...
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-4 h-4" />
                ตรวจสอบและพรีวิวข้อมูล (10 แถวแรก)
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleSeedDemoData}
            disabled={isSeeding}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs transition active:scale-95"
            title="นำเข้าไฟล์ต้นฉบับในโฟลเดอร์เครื่อง หรือโหลดชุดข้อมูลตัวอย่างทันที"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            {isSeeding ? "กำลังโหลดข้อมูล..." : "โหลดข้อมูลต้นฉบับ / ตัวอย่าง (One-Click Seed)"}
          </button>
        </div>

        {/* Status Alerts */}
        {statusMessage && (
          <div
            className={`mt-4 p-4 rounded-2xl text-xs flex items-start gap-3 animate-fade-in ${
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
      </div>

      {/* Preview Modal */}
      <DataPreviewModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        onConfirm={handleConfirmImport}
        previewData={previewData}
        totalRows={totalRows}
        fileName={file?.name || "Excel_File"}
        fileType={fileType}
        isSaving={isSaving}
      />
    </div>
  );
}
