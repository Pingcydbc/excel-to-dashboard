"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { DollarSign } from "lucide-react";

interface SalaryRangeBarChartProps {
  data: { range: string; count: number }[];
}

const colors = ["#94a3b8", "#38bdf8", "#6366f1", "#10b981"];

export default function SalaryRangeBarChart({ data = [] }: SalaryRangeBarChartProps) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <DollarSign className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">การกระจายตัวของฐานเงินเดือน</h3>
            <p className="text-xs text-slate-400">จำแนกตามกลุ่มรายได้ของผู้สำเร็จการศึกษา</p>
          </div>
        </div>
      </div>

      <div className="h-60 w-full">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-400">
            ไม่มีข้อมูลฐานเงินเดือน
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
              <XAxis dataKey="range" tick={{ fontSize: 10, fill: "#64748b" }} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
              <Tooltip
                formatter={(value: any) => [`${value} คน`, "จำนวนผู้รับเงินเดือน"]}
                contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
