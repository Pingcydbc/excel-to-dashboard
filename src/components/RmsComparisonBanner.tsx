"use client";

import { useState } from "react";
import { CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, Users, Filter } from "lucide-react";

interface RmsStudent {
  id: string;
  prefix: string;
  name: string;
  surname: string;
  group_id: string;
}

interface RmsComparisonProps {
  rmsComparison?: {
    enabled: boolean;
    totalRms: number;
    matchedCount: number;
    matchedByIdCount?: number;
    matchedByNameCount?: number;
    missingInVcopCount: number;
    missingInVcopStudents?: RmsStudent[];
    inactiveInVcopCount: number;
    totalRawVcop: number;
  } | null;
}

export default function RmsComparisonBanner({ rmsComparison }: RmsComparisonProps) {
  const [showMissingList, setShowMissingList] = useState(false);

  if (!rmsComparison || !rmsComparison.enabled) {
    return null;
  }

  const {
    totalRms = 0,
    matchedCount = 0,
    matchedByIdCount = 0,
    matchedByNameCount = 0,
    missingInVcopCount = 0,
    missingInVcopStudents = [],
    inactiveInVcopCount = 0,
    totalRawVcop = 0,
  } = rmsComparison;

  const matchRate = totalRms > 0 ? ((matchedCount / totalRms) * 100).toFixed(1) : "0.0";

  return (
    <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50/70 via-white to-emerald-50/60 p-4 shadow-sm space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-600 text-white">
            RMS API Connected
          </span>
          <h3 className="text-xs sm:text-sm font-extrabold text-slate-800">
            ผลการเปรียบเทียบข้อมูลนักศึกษาปัจจุบัน (RMS vs V-COP ศธ.02)
          </h3>
        </div>
        {missingInVcopCount > 0 && (
          <button
            type="button"
            onClick={() => setShowMissingList((v) => !v)}
            className="no-print inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300 transition self-start sm:self-auto"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            {showMissingList
              ? "ซ่อนรายชื่อที่ยังไม่พบในไฟล์"
              : `ดูรายชื่อที่ไม่พบในไฟล์ V-COP (${missingInVcopCount.toLocaleString()} คน • นับเป็น 0%)`}
            {showMissingList ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="bg-white rounded-xl p-3 border border-slate-200/80">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-semibold">
            <Users className="w-3.5 h-3.5 text-indigo-600" />
            นักศึกษาใน RMS (แสดงบนเว็บ)
          </div>
          <div className="text-base font-extrabold text-slate-900 mt-0.5">
            {totalRms.toLocaleString()} <span className="text-xs font-normal text-slate-500">คน</span>
          </div>
          <div className="text-[10px] text-slate-400">ดึงตามจำนวนจริงในระบบ RMS</div>
        </div>

        <div className="bg-white rounded-xl p-3 border border-emerald-200">
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            พบข้อมูลในไฟล์ V-COP
          </div>
          <div className="text-base font-extrabold text-emerald-600 mt-0.5">
            {matchedCount.toLocaleString()} <span className="text-xs font-normal">คน</span>
          </div>
          <div className="text-[10px] text-emerald-600 font-medium">
            {matchRate}% (ตรงรหัส {matchedByIdCount.toLocaleString()} • ตรงชื่อ {matchedByNameCount.toLocaleString()})
          </div>
        </div>

        <div className="bg-white rounded-xl p-3 border border-amber-200">
          <div className="flex items-center gap-1.5 text-[11px] text-amber-700 font-semibold">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            ไม่พบในไฟล์ V-COP (นับ 0%)
          </div>
          <div className="text-base font-extrabold text-amber-600 mt-0.5">
            {missingInVcopCount.toLocaleString()} <span className="text-xs font-normal">คน</span>
          </div>
          <div className="text-[10px] text-amber-700 font-medium">รวมอยู่ในยอด {totalRms.toLocaleString()} คนแล้ว</div>
        </div>

        <div className="bg-white rounded-xl p-3 border border-slate-200/80">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-semibold">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            ข้อมูลเก่าในไฟล์ V-COP (ตัดออก)
          </div>
          <div className="text-base font-extrabold text-slate-700 mt-0.5">
            {inactiveInVcopCount.toLocaleString()}{" "}
            <span className="text-xs font-normal text-slate-500">คน</span>
          </div>
          <div className="text-[10px] text-slate-400">
            จากไฟล์ดิบ {totalRawVcop.toLocaleString()} คน
          </div>
        </div>
      </div>

      {showMissingList && missingInVcopStudents.length > 0 && (
        <div className="bg-white rounded-xl border border-amber-200 p-3 space-y-2">
          <div className="text-xs font-bold text-slate-800">
            รายชื่อนักศึกษาที่มีในระบบ RMS แต่ไม่พบในไฟล์ V-COP ศธ.02 ({missingInVcopStudents.length} คน)
          </div>
          <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs text-slate-700 border-collapse">
              <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-[11px] font-bold text-slate-700">
                <tr>
                  <th className="py-2 px-3 text-center w-12">ลำดับ</th>
                  <th className="py-2 px-3">รหัสนักศึกษา</th>
                  <th className="py-2 px-3">ชื่อ-นามสกุล</th>
                  <th className="py-2 px-3">รหัสกลุ่มเรียน (RMS)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {missingInVcopStudents.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-amber-50/40">
                    <td className="py-1.5 px-3 text-center text-slate-500">{idx + 1}</td>
                    <td className="py-1.5 px-3 font-mono font-semibold text-slate-900">{s.id}</td>
                    <td className="py-1.5 px-3 font-medium text-slate-900">
                      {s.prefix}
                      {s.name} {s.surname}
                    </td>
                    <td className="py-1.5 px-3 font-mono text-slate-600">{s.group_id || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

