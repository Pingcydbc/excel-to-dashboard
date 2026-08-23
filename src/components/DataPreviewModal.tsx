"use client";

import { X, CheckCircle, FileSpreadsheet, AlertCircle } from "lucide-react";

interface DataPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  previewData: any[];
  totalRows: number;
  fileName: string;
  fileType: string;
  isSaving: boolean;
}

export default function DataPreviewModal({
  isOpen,
  onClose,
  onConfirm,
  previewData = [],
  totalRows = 0,
  fileName,
  fileType,
  isSaving = false,
}: DataPreviewModalProps) {
  if (!isOpen) return null;

  const headers = previewData.length > 0 ? Object.keys(previewData[0]) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                พรีวิวข้อมูลก่อนนำเข้า (Data Preview)
              </h2>
              <p className="text-xs text-slate-500">
                ไฟล์: <span className="font-semibold text-slate-700">{fileName}</span> • ประเภท:{" "}
                <span className="font-semibold text-indigo-600">
                  {fileType === "profile_status"
                    ? "สถานะการปรับปรุงข้อมูล"
                    : "สรุปผลการติดตามผู้สำเร็จการศึกษา"}
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <span>แสดงตัวอย่าง 10 แถวแรกจากทั้งหมด {totalRows.toLocaleString()} รายการ</span>
            </div>
            <span className="text-xs text-slate-400">กรุณาตรวจสอบความถูกต้องของหัวตาราง</span>
          </div>

          {/* Table */}
          <div className="border border-slate-200 rounded-2xl overflow-x-auto shadow-sm">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 text-[11px]">
                <tr>
                  <th className="px-3.5 py-3">#</th>
                  {headers.map((h) => (
                    <th key={h} className="px-3.5 py-3 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {previewData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition">
                    <td className="px-3.5 py-2.5 font-medium text-slate-400">{idx + 1}</td>
                    {headers.map((h) => (
                      <td key={h} className="px-3.5 py-2.5 whitespace-nowrap text-slate-800">
                        {row[h] || "-"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md hover:shadow-lg transition active:scale-95 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <span className="animate-spin inline-block">⏳</span>
                กำลังบันทึกลงฐานข้อมูล...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                ยืนยันการนำเข้า ({totalRows.toLocaleString()} แถว)
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
