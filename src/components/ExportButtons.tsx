"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { Download, FileText, Printer } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface ExportButtonsProps {
  data?: any[];
  fileName?: string;
  pdfTargetId?: string;
  showExcel?: boolean;
  showPdf?: boolean;
  excelLabel?: string;
  pdfLabel?: string;
}

export default function ExportButtons({
  data = [],
  fileName = "report_export",
  pdfTargetId = "dashboard-content",
  showExcel = true,
  showPdf = true,
  excelLabel = "ส่งออก Excel",
  pdfLabel = "ส่งออก PDF Report",
}: ExportButtonsProps) {
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const handleExportExcel = () => {
    if (!data || data.length === 0) {
      alert("ไม่มีข้อมูลสำหรับส่งออก");
      return;
    }
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    XLSX.writeFile(workbook, `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleExportPdf = async () => {
    const targetElement = document.getElementById(pdfTargetId);
    if (!targetElement) {
      // Fallback to window.print()
      window.print();
      return;
    }

    try {
      setIsExportingPdf(true);
      const canvas = await html2canvas(targetElement, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${fileName}_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error("PDF Export Error:", err);
      window.print();
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="flex items-center gap-2 no-print">
      {showExcel && (
        <button
          onClick={handleExportExcel}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition active:scale-95"
        >
          <Download className="w-3.5 h-3.5" />
          {excelLabel}
        </button>
      )}

      {showPdf && (
        <button
          onClick={handleExportPdf}
          disabled={isExportingPdf}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-900 text-white shadow-sm transition active:scale-95 disabled:opacity-50"
        >
          {isExportingPdf ? (
            <span className="inline-block animate-spin mr-1">⏳</span>
          ) : (
            <FileText className="w-3.5 h-3.5 text-rose-300" />
          )}
          {isExportingPdf ? "กำลังสร้าง PDF..." : pdfLabel}
        </button>
      )}

      <button
        onClick={() => window.print()}
        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
        title="พิมพ์รายงาน"
      >
        <Printer className="w-4 h-4" />
      </button>
    </div>
  );
}
