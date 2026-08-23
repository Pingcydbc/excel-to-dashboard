"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";

interface MajorJobMatchBarChartProps {
  data: { major: string; matched: number; notMatched: number; total: number }[];
}

export default function MajorJobMatchBarChart({ data = [] }: MajorJobMatchBarChartProps) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800">สัดส่วนการทำงานตรงสาย vs ไม่ตรงสาย</h3>
          <p className="text-xs text-slate-400">เปรียบเทียบตามสาขาวิชาที่มีผู้ทำงานสูงสุด</p>
        </div>
      </div>

      <div className="h-72 w-full">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-400">
            ไม่มีข้อมูลการทำงานตรงสายในตัวกรองนี้
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 10, right: 15, left: -15, bottom: 25 }}
            >
              <XAxis
                dataKey="major"
                tick={{ fontSize: 10, fill: "#64748b" }}
                angle={-15}
                textAnchor="end"
                interval={0}
              />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
              <Tooltip
                formatter={(value: any, name: any) => [
                  `${value} คน`,
                  name === "matched" ? "ตรงสาย" : "ไม่ตรงสาย",
                ]}
                contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                iconSize={8}
                formatter={(value) => (
                  <span className="text-xs text-slate-600 font-medium">
                    {value === "matched" ? "ทำงานตรงสาย" : "ทำงานไม่ตรงสาย"}
                  </span>
                )}
              />
              <Bar dataKey="matched" fill="#10b981" radius={[4, 4, 0, 0]} name="matched" />
              <Bar dataKey="notMatched" fill="#f59e0b" radius={[4, 4, 0, 0]} name="notMatched" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
