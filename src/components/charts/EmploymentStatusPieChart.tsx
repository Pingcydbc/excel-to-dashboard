"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

interface EmploymentStatusPieChartProps {
  data: { name: string; value: number; color: string }[];
  total: number;
}

export default function EmploymentStatusPieChart({
  data = [],
  total = 0,
}: EmploymentStatusPieChartProps) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-sm font-bold text-slate-800">สถานะหลังจบการศึกษา</h3>
          <p className="text-xs text-slate-400">สัดส่วนการทำงาน ศึกษาต่อ และอื่นๆ</p>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-400">ผู้สำเร็จการศึกษา</span>
          <p className="text-lg font-extrabold text-slate-900">{total.toLocaleString()} คน</p>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={4}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: any) => [
                `${value.toLocaleString()} คน (${total > 0 ? ((value / total) * 100).toFixed(1) : 0}%)`,
                "จำนวน",
              ]}
              contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              iconSize={8}
              formatter={(value) => <span className="text-xs text-slate-600 font-medium">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
        {data.map((item) => (
          <div key={item.name} className="flex items-center justify-between px-2 py-1 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-xs text-slate-600 truncate">{item.name}</span>
            </div>
            <span className="text-xs font-bold text-slate-800">
              {total > 0 ? ((item.value / total) * 100).toFixed(1) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
