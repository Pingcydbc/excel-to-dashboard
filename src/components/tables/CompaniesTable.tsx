"use client";

import { Search, ChevronLeft, ChevronRight, Building2, Users, Briefcase, Award } from "lucide-react";

interface CompanyData {
  companyName: string;
  hiredCount: number;
  positions: string[];
  majors: string[];
  sampleSalary: string;
  matchRate: number;
}

interface CompaniesTableProps {
  companies: CompanyData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  searchTerm: string;
  onSearchChange: (search: string) => void;
  onPageChange: (page: number) => void;
  loading?: boolean;
}

export default function CompaniesTable({
  companies = [],
  pagination,
  searchTerm,
  onSearchChange,
  onPageChange,
  loading = false,
}: CompaniesTableProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหาชื่อสถานประกอบการ หรือตำแหน่งงาน..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 text-[11px] uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3.5">ลำดับ</th>
              <th className="px-4 py-3.5">สถานประกอบการ / หน่วยงาน</th>
              <th className="px-4 py-3.5 text-center">จำนวนที่รับเข้าทำงาน</th>
              <th className="px-4 py-3.5">ตำแหน่งงานยอดนิยม</th>
              <th className="px-4 py-3.5">สาขาวิชาที่รับเข้าทำงาน</th>
              <th className="px-4 py-3.5 text-center">ตรงสาย (%)</th>
              <th className="px-4 py-3.5">ฐานเงินเดือนตัวอย่าง</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                  กำลังโหลดข้อมูลสถานประกอบการ...
                </td>
              </tr>
            ) : companies.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                  ไม่พบข้อมูลสถานประกอบการ
                </td>
              </tr>
            ) : (
              companies.map((company, idx) => (
                <tr key={company.companyName} className="hover:bg-slate-50/70 transition">
                  <td className="px-4 py-3 font-semibold text-slate-400">
                    {(pagination.page - 1) * pagination.limit + idx + 1}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 font-bold text-slate-900">
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                        <Building2 className="w-3.5 h-3.5" />
                      </div>
                      <span>{company.companyName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700">
                      <Users className="w-3 h-3" />
                      {company.hiredCount.toLocaleString()} คน
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {company.positions.map((p, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px]">
                          {p}
                        </span>
                      ))}
                      {company.positions.length === 0 && <span className="text-slate-400">-</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {company.majors.map((m, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[11px]">
                          {m}
                        </span>
                      ))}
                      {company.majors.length === 0 && <span className="text-slate-400">-</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-semibold text-emerald-600">
                      {company.matchRate}%
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-700">
                    {company.sampleSalary !== "-" ? `฿ ${company.sampleSalary}` : "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <div>
          แสดง {(pagination.page - 1) * pagination.limit + 1} -{" "}
          {Math.min(pagination.page * pagination.limit, pagination.total)} จากทั้งหมด{" "}
          <span className="font-semibold text-slate-800">{pagination.total.toLocaleString()}</span> สถานประกอบการ
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-slate-700 font-medium">
            หน้า {pagination.page} / {pagination.totalPages || 1}
          </span>
          <button
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
