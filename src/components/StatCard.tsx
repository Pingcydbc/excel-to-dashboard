import { LucideIcon } from "lucide-react";
import React from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color?: "indigo" | "emerald" | "blue" | "amber" | "purple" | "rose";
  trend?: string;
  trendPositive?: boolean;
}

const colorStyles = {
  indigo: {
    bg: "bg-indigo-50/70",
    text: "text-indigo-600",
    border: "border-indigo-100",
    iconBg: "bg-indigo-500",
  },
  emerald: {
    bg: "bg-emerald-50/70",
    text: "text-emerald-600",
    border: "border-emerald-100",
    iconBg: "bg-emerald-500",
  },
  blue: {
    bg: "bg-blue-50/70",
    text: "text-blue-600",
    border: "border-blue-100",
    iconBg: "bg-blue-500",
  },
  amber: {
    bg: "bg-amber-50/70",
    text: "text-amber-600",
    border: "border-amber-100",
    iconBg: "bg-amber-500",
  },
  purple: {
    bg: "bg-purple-50/70",
    text: "text-purple-600",
    border: "border-purple-100",
    iconBg: "bg-purple-500",
  },
  rose: {
    bg: "bg-rose-50/70",
    text: "text-rose-600",
    border: "border-rose-100",
    iconBg: "bg-rose-500",
  },
};

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = "indigo",
  trend,
  trendPositive = true,
}: StatCardProps) {
  const styles = colorStyles[color] || colorStyles.indigo;

  return (
    <div className={`bg-white rounded-2xl p-5 border ${styles.border} shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between`}>
      <div className="flex items-start justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</span>
        <div className={`w-10 h-10 rounded-xl ${styles.iconBg} text-white flex items-center justify-center shadow-sm`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="mt-3">
        <div className="text-2xl font-bold text-slate-900 tracking-tight">{value}</div>
        {subtitle && (
          <p className="mt-1 text-xs text-slate-500 flex items-center gap-1.5 font-normal">
            {trend && (
              <span
                className={`font-semibold px-1.5 py-0.5 rounded text-[11px] ${
                  trendPositive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                }`}
              >
                {trend}
              </span>
            )}
            <span>{subtitle}</span>
          </p>
        )}
      </div>
    </div>
  );
}
