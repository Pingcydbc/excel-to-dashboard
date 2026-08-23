"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { Building2 } from "lucide-react";

interface TopCompaniesBarChartProps {
  data: {
    companyName: string;
    count: number;
    topPosition: string;
    primaryMajor: string;
  }[];
}

export default function TopCompaniesBarChart({ data = [] }: TopCompaniesBarChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    shortName: d.companyName.length > 22 ? d.companyName.substring(0, 20) + "..." : d.companyName,
  }));

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">อันดับสถานประกอบการที่รับทำงานสูงสุด</h3>
            <p className="text-xs text-slate-400">Top 10 สถานประกอบการที่รับนักศึกษาเข้าทำงาน</p>
          </div>
        </div>
      </div>

      <div className="h-72 w-full">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-400">
            ไม่มีข้อมูลสถานประกอบการในตัวกรองนี้
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 25, left: 10, bottom: 5 }}
            >
              <XAxis type="number" tick={{ fontSize: 10, fill: "#64748b" }} />
              <YAxis
                type="category"
                dataKey="shortName"
                width={120}
                tick={{ fontSize: 10, fill: "#475569" }}
              />
              <Tooltip
                formatter={(value: any, name: any, item: any) => [
                  `${value} คน (ตำแหน่งหลัก: ${item.payload.topPosition}, สาขา: ${item.payload.primaryMajor})`,
                  "จำนวนที่รับเข้าทำงาน",
                ]}
                contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }}
              />
              <Bar dataKey="count" fill="#4f46e5" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
