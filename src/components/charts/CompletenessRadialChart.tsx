"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";

interface CompletenessRadialChartProps {
  distribution: { range: string; count: number; color: string }[];
  avgCompleteness: number;
}

export default function CompletenessRadialChart({
  distribution = [],
  avgCompleteness = 0,
}: CompletenessRadialChartProps) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-sm font-bold text-slate-800">การกระจายความสมบูรณ์ของโปรไฟล์</h3>
          <p className="text-xs text-slate-400">จำแนกตามช่วงเปอร์เซ็นต์ (0 - 100%)</p>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-400">ค่าเฉลี่ยรวม</span>
          <p className="text-lg font-extrabold text-indigo-600">{avgCompleteness}%</p>
        </div>
      </div>

      <div className="h-56 w-full mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={distribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis dataKey="range" tick={{ fontSize: 11, fill: "#64748b" }} />
            <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
            <Tooltip
              formatter={(value: any) => [`${value} คน`, "จำนวนนักเรียน"]}
              contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }}
            />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {distribution.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-100 text-center">
        {distribution.map((item) => (
          <div key={item.range} className="p-1.5 rounded-lg bg-slate-50">
            <div className="flex items-center justify-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-[11px] text-slate-500">{item.range}</span>
            </div>
            <span className="text-xs font-bold text-slate-800">{item.count.toLocaleString()} คน</span>
          </div>
        ))}
      </div>
    </div>
  );
}
