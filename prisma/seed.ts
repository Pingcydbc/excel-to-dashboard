import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";

const prisma = new PrismaClient();

function cleanStr(val: any): string {
  if (val === null || val === undefined) return "";
  let s = String(val).trim();
  if (s.endsWith(".0") && /^\d+\.0$/.test(s)) {
    s = s.substring(0, s.length - 2);
  }
  return s;
}

function parseCompleteness(val: any): number {
  if (val === null || val === undefined) return 0;
  let str = String(val).replace("%", "").trim();
  let num = parseFloat(str);
  if (isNaN(num)) return 0;
  if (num > 0 && num <= 1.0) {
    num = num * 100;
  }
  return Math.min(100, Math.max(0, Math.round(num * 10) / 10));
}

function parseDate(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date && !isNaN(val.getTime())) return val;
  if (typeof val === "number") {
    const utcDays = Math.floor(val - 25569);
    const utcValue = utcDays * 86400;
    const dateInfo = new Date(utcValue * 1000);
    return isNaN(dateInfo.getTime()) ? null : dateInfo;
  }
  const str = String(val).trim();
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) return parsed;
  const thaiDateMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (thaiDateMatch) {
    const day = parseInt(thaiDateMatch[1], 10);
    const month = parseInt(thaiDateMatch[2], 10) - 1;
    let year = parseInt(thaiDateMatch[3], 10);
    if (year > 2400) year -= 543;
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

async function main() {
  console.log("🌱 Starting database seeding...");

  // 1. Create Default Admin User from Environment
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@gmail.com").trim().toLowerCase();
  const adminRawPassword = process.env.ADMIN_PASSWORD || "admincmtcvcop123";
  const adminPassword = await bcrypt.hash(adminRawPassword, 10);
  const admin = await prisma.adminUser.upsert({
    where: { email: adminEmail },
    update: { password: adminPassword },
    create: {
      email: adminEmail,
      password: adminPassword,
      name: "ผู้ดูแลระบบ (Admin)",
      role: "ADMIN",
    },
  });
  console.log(`✅ Admin user verified: ${admin.email}`);

  // 2. Check if original excel files exist in D:\excel_to_dashbord\
  const profileFile = path.resolve("D:/excel_to_dashbord/รายงานสถานการปรับปรุงข้อมูลนักเรียน นักศ.xls");
  const graduateFile = path.resolve("D:/excel_to_dashbord/รายงานสรุปผลการติดตาม (รายบุคคล) ผู้สำเร็จ.xls");

  if (fs.existsSync(profileFile)) {
    try {
      console.log("📂 Parsing student profile Excel file from disk...");
      const buf = fs.readFileSync(profileFile);
      const workbook = XLSX.read(buf, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const rawRows = XLSX.utils.sheet_to_json<any[]>(workbook.Sheets[sheetName], { header: 1, defval: "" });

      let profileImported = 0;
      // Skip title rows (row 0 to 6)
      const dataRows = rawRows.slice(7);
      for (const row of dataRows) {
        if (!row || row.length === 0) continue;
        const studentId = cleanStr(row[1]);
        if (!studentId || isNaN(Number(studentId.charAt(0)))) continue;

        let firstName = cleanStr(row[4]);
        let lastName = cleanStr(row[5]);
        let prefix = "";
        if (firstName.startsWith("นาย ")) {
          prefix = "นาย";
          firstName = firstName.substring(4).trim();
        } else if (firstName.startsWith("นางสาว ")) {
          prefix = "นางสาว";
          firstName = firstName.substring(7).trim();
        } else if (firstName.startsWith("น.ส. ")) {
          prefix = "นางสาว";
          firstName = firstName.substring(5).trim();
        }

        const educationLevel = cleanStr(row[7]) || "ปวช.";
        const faculty = cleanStr(row[8]);
        const major = cleanStr(row[9]);
        const minor = cleanStr(row[10]);
        const lastProfileUpdate = parseDate(row[11]);
        const completeness = parseCompleteness(row[12]);

        await prisma.studentProfileStatus.upsert({
          where: { studentId },
          update: {
            prefix,
            firstName: firstName || "ไม่ระบุชื่อ",
            lastName,
            educationLevel,
            faculty,
            major,
            minor,
            lastProfileUpdate,
            completeness,
          },
          create: {
            studentId,
            prefix,
            firstName: firstName || "ไม่ระบุชื่อ",
            lastName,
            educationLevel,
            faculty,
            major,
            minor,
            lastProfileUpdate,
            completeness,
          },
        });
        profileImported++;
      }
      console.log(`✅ Loaded ${profileImported} student profiles from real file.`);
    } catch (e: any) {
      console.warn("⚠️ Could not load real profile file:", e.message);
    }
  }

  if (fs.existsSync(graduateFile)) {
    try {
      console.log("📂 Parsing graduate tracking Excel file from disk...");
      const buf = fs.readFileSync(graduateFile);
      const workbook = XLSX.read(buf, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const rawRows = XLSX.utils.sheet_to_json<any[]>(workbook.Sheets[sheetName], { header: 1, defval: "" });

      let graduateImported = 0;
      const dataRows = rawRows.slice(6);
      for (const row of dataRows) {
        if (!row || row.length === 0) continue;
        const studentId = cleanStr(row[1]);
        if (!studentId || isNaN(Number(studentId.charAt(0)))) continue;

        const fullName = cleanStr(row[2]) || "ไม่ระบุชื่อ";
        const educationLevel = cleanStr(row[4]) || "ปวช.";
        const faculty = cleanStr(row[5]);
        const major = cleanStr(row[6]);
        const gradYear = parseInt(cleanStr(row[7]), 10) || 2567;
        const trackingStatus = cleanStr(row[8]) || (cleanStr(row[12]) ? "มีงานทำ" : "ว่างงาน");
        const companyName = cleanStr(row[12]);
        const jobPosition = cleanStr(row[13]);
        const salaryRange = cleanStr(row[14]);
        const jobMajorMatch = cleanStr(row[15]);
        const furtherStudyLevel = cleanStr(row[9]);
        const instituteName = cleanStr(row[10]);
        const studyMajorMatch = cleanStr(row[11]);

        await prisma.graduateTracking.create({
          data: {
            studentId,
            fullName,
            educationLevel,
            faculty,
            major,
            gradYear: gradYear > 2400 ? gradYear : gradYear + 543,
            trackingStatus,
            companyName,
            jobPosition,
            salaryRange,
            jobMajorMatch,
            furtherStudyLevel,
            instituteName,
            studyMajorMatch,
          },
        });
        graduateImported++;
      }
      console.log(`✅ Loaded ${graduateImported} graduate tracking records from real file.`);
    } catch (e: any) {
      console.warn("⚠️ Could not load real graduate file:", e.message);
    }
  }

  // 3. Fallback realistic sample records if counts are still 0
  const profileCount = await prisma.studentProfileStatus.count();
  if (profileCount === 0) {
    console.log("📝 Generating 20 realistic student profile status records...");
    const sampleProfiles = [
      { studentId: "66209010001", prefix: "นาย", firstName: "ธนภัทร", lastName: "สมบูรณ์ดี", educationLevel: "ปวช.", faculty: "เทคโนโลยีสารสนเทศ", major: "เทคโนโลยีสารสนเทศ", minor: "เทคโนโลยีสารสนเทศ", completeness: 100, lastProfileUpdate: new Date("2024-06-15") },
      { studentId: "66209010002", prefix: "นางสาว", firstName: "ณัฐณิชา", lastName: "จารุวรรณ", educationLevel: "ปวช.", faculty: "เทคโนโลยีสารสนเทศ", major: "เทคโนโลยีสารสนเทศ", minor: "เทคโนโลยีสารสนเทศ", completeness: 92.5, lastProfileUpdate: new Date("2024-06-18") },
      { studentId: "66209010003", prefix: "นาย", firstName: "กิตติศักดิ์", lastName: "วงค์สุวรรณ", educationLevel: "ปวช.", faculty: "ช่างอุตสาหกรรม", major: "ช่างไฟฟ้ากำลัง", minor: "เครื่องกลไฟฟ้า", completeness: 85.0, lastProfileUpdate: new Date("2024-07-01") },
      { studentId: "66209010004", prefix: "นาย", firstName: "ปิยะพงษ์", lastName: "แสงอรุณ", educationLevel: "ปวช.", faculty: "ช่างอุตสาหกรรม", major: "ช่างไฟฟ้ากำลัง", minor: "การติดตั้งไฟฟ้า", completeness: 45.0, lastProfileUpdate: new Date("2024-05-10") },
      { studentId: "66209010005", prefix: "นางสาว", firstName: "ชุติมา", lastName: "รัตนประเสริฐ", educationLevel: "ปวช.", faculty: "พาณิชยกรรม", major: "การบัญชี", minor: "การบัญชี", completeness: 100, lastProfileUpdate: new Date("2024-06-20") },
      { studentId: "66209010006", prefix: "นางสาว", firstName: "ศิริพร", lastName: "ไชยชนะ", educationLevel: "ปวช.", faculty: "พาณิชยกรรม", major: "การตลาด", minor: "การตลาดดิจิทัล", completeness: 78.0, lastProfileUpdate: new Date("2024-06-12") },
      { studentId: "66209010007", prefix: "นาย", firstName: "วรเมธ", lastName: "เพชรจำรัส", educationLevel: "ปวช.", faculty: "ช่างอุตสาหกรรม", major: "ช่างยนต์", minor: "ยานยนต์", completeness: 35.0, lastProfileUpdate: null },
      { studentId: "66209010008", prefix: "นาย", firstName: "อนันดา", lastName: "สุริยะโชติ", educationLevel: "ปวช.", faculty: "ช่างอุตสาหกรรม", major: "ช่างยนต์", minor: "ยานยนต์", completeness: 88.0, lastProfileUpdate: new Date("2024-06-25") },
      { studentId: "65309010001", prefix: "นาย", firstName: "ชยพล", lastName: "วัฒนากุล", educationLevel: "ปวส.", faculty: "เทคโนโลยีสารสนเทศ", major: "เทคโนโลยีสารสนเทศ", minor: "นักพัฒนาซอฟต์แวร์", completeness: 100, lastProfileUpdate: new Date("2024-06-30") },
      { studentId: "65309010002", prefix: "นางสาว", firstName: "พิมพ์มาดา", lastName: "ศิริโชค", educationLevel: "ปวส.", faculty: "เทคโนโลยีสารสนเทศ", major: "เทคโนโลยีสารสนเทศ", minor: "เครือข่ายคอมพิวเตอร์", completeness: 95.0, lastProfileUpdate: new Date("2024-07-02") },
      { studentId: "65309010003", prefix: "นาย", firstName: "ภาณุพงศ์", lastName: "อินทร์แก้ว", educationLevel: "ปวส.", faculty: "ช่างอุตสาหกรรม", major: "ช่างไฟฟ้ากำลัง", minor: "ระบบควบคุมอัตโนมัติ", completeness: 90.0, lastProfileUpdate: new Date("2024-06-14") },
      { studentId: "65309010004", prefix: "นาย", firstName: "เอกชัย", lastName: "มั่นคง", educationLevel: "ปวส.", faculty: "ช่างอุตสาหกรรม", major: "ช่างยนต์", minor: "เทคโนโลยียานยนต์ไฟฟ้า", completeness: 60.0, lastProfileUpdate: new Date("2024-05-28") },
      { studentId: "65309010005", prefix: "นางสาว", firstName: "พัชราภา", lastName: "สุนทรภักดี", educationLevel: "ปวส.", faculty: "พาณิชยกรรม", major: "การบัญชี", minor: "การบัญชีภาษีอากร", completeness: 100, lastProfileUpdate: new Date("2024-06-22") },
      { studentId: "65309010006", prefix: "นางสาว", firstName: "สุภัสสรา", lastName: "พงษ์พาณิช", educationLevel: "ปวส.", faculty: "พาณิชยกรรม", major: "การจัดการทั่วไป", minor: "การจัดการโลจิสติกส์", completeness: 85.0, lastProfileUpdate: new Date("2024-06-19") },
      { studentId: "65309010007", prefix: "นาย", firstName: "ธีรเดช", lastName: "สิทธิพงศ์", educationLevel: "ปวส.", faculty: "ช่างอุตสาหกรรม", major: "ช่างอิเล็กทรอนิกส์", minor: "ระบบสมองกลฝังตัว", completeness: 40.0, lastProfileUpdate: null },
    ];

    for (const r of sampleProfiles) {
      await prisma.studentProfileStatus.create({ data: r });
    }
  }

  const gradCount = await prisma.graduateTracking.count();
  if (gradCount === 0) {
    console.log("📝 Generating 20 realistic graduate tracking & company records...");
    const sampleGraduates = [
      { studentId: "65209010001", fullName: "นายธนวัฒน์ ศรีสมบัติ", educationLevel: "ปวช.", faculty: "เทคโนโลยีสารสนเทศ", major: "เทคโนโลยีสารสนเทศ", gradYear: 2567, gradTerm: "2", trackingStatus: "ศึกษาต่อ", furtherStudyLevel: "ปวส.", instituteName: "วิทยาลัยเทคนิคเชียงใหม่", studyMajorMatch: "ตรงสาย", companyName: "", jobPosition: "", salaryRange: "", jobMajorMatch: "" },
      { studentId: "65209010002", fullName: "นางสาววารุณี เจริญสุข", educationLevel: "ปวช.", faculty: "พาณิชยกรรม", major: "การบัญชี", gradYear: 2567, gradTerm: "2", trackingStatus: "ศึกษาต่อ", furtherStudyLevel: "ปริญญาตรี", instituteName: "มหาวิทยาลัยเทคโนโลยีราชมงคลล้านนา", studyMajorMatch: "ตรงสาย", companyName: "", jobPosition: "", salaryRange: "", jobMajorMatch: "" },
      { studentId: "64309010001", fullName: "นายพีรพล กลิ่นสุคนธ์", educationLevel: "ปวส.", faculty: "เทคโนโลยีสารสนเทศ", major: "เทคโนโลยีสารสนเทศ", gradYear: 2567, gradTerm: "2", trackingStatus: "มีงานทำ", furtherStudyLevel: "", instituteName: "", studyMajorMatch: "", companyName: "บริษัท ซีพี ออลล์ จำกัด (มหาชน)", jobPosition: "IT Support Specialist", salaryRange: "15,001 - 25,000", jobMajorMatch: "ตรงสาย" },
      { studentId: "64309010002", fullName: "นายชัยวัฒน์ มานะดี", educationLevel: "ปวส.", faculty: "เทคโนโลยีสารสนเทศ", major: "เทคโนโลยีสารสนเทศ", gradYear: 2567, gradTerm: "2", trackingStatus: "มีงานทำ", furtherStudyLevel: "", instituteName: "", studyMajorMatch: "", companyName: "บริษัท ซีพี ออลล์ จำกัด (มหาชน)", jobPosition: "Frontend Developer", salaryRange: "15,001 - 25,000", jobMajorMatch: "ตรงสาย" },
      { studentId: "64309010003", fullName: "นางสาวธิดารัตน์ พรหมวิชัย", educationLevel: "ปวส.", faculty: "เทคโนโลยีสารสนเทศ", major: "เทคโนโลยีสารสนเทศ", gradYear: 2567, gradTerm: "2", trackingStatus: "มีงานทำ", furtherStudyLevel: "", instituteName: "", studyMajorMatch: "", companyName: "บริษัท ซีจี อินเตอร์เนชั่นแนล กรุ๊ป จำกัด", jobPosition: "Web Developer", salaryRange: "15,001 - 25,000", jobMajorMatch: "ตรงสาย" },
      { studentId: "64309010004", fullName: "นายกฤษณะ บุญส่ง", educationLevel: "ปวส.", faculty: "ช่างอุตสาหกรรม", major: "ช่างไฟฟ้ากำลัง", gradYear: 2567, gradTerm: "2", trackingStatus: "มีงานทำ", furtherStudyLevel: "", instituteName: "", studyMajorMatch: "", companyName: "บริษัท ปูนซิเมนต์ไทย จำกัด (มหาชน) - SCG", jobPosition: "ช่างซ่อมบำรุงไฟฟ้า", salaryRange: "15,001 - 25,000", jobMajorMatch: "ตรงสาย" },
      { studentId: "64309010005", fullName: "นายอภิชาติ ปานทอง", educationLevel: "ปวส.", faculty: "ช่างอุตสาหกรรม", major: "ช่างไฟฟ้ากำลัง", gradYear: 2567, gradTerm: "2", trackingStatus: "มีงานทำ", furtherStudyLevel: "", instituteName: "", studyMajorMatch: "", companyName: "บริษัท ปูนซิเมนต์ไทย จำกัด (มหาชน) - SCG", jobPosition: "ช่างเทคนิคระบบไฟฟ้า", salaryRange: "15,001 - 25,000", jobMajorMatch: "ตรงสาย" },
      { studentId: "64309010006", fullName: "นายภาสกร ใจดี", educationLevel: "ปวส.", faculty: "ช่างอุตสาหกรรม", major: "ช่างไฟฟ้ากำลัง", gradYear: 2567, gradTerm: "2", trackingStatus: "มีงานทำ", furtherStudyLevel: "", instituteName: "", studyMajorMatch: "", companyName: "บริษัท สยามเด็นโซ่ แมนูแฟคเจอริ่ง จำกัด", jobPosition: "ช่างควบคุมเครื่องจักร", salaryRange: "9,001 - 15,000", jobMajorMatch: "ตรงสาย" },
      { studentId: "64309010007", fullName: "นายภูวนาท ธรรมะ", educationLevel: "ปวส.", faculty: "ช่างอุตสาหกรรม", major: "ช่างยนต์", gradYear: 2567, gradTerm: "2", trackingStatus: "มีงานทำ", furtherStudyLevel: "", instituteName: "", studyMajorMatch: "", companyName: "บริษัท โตโยต้า มอเตอร์ ประเทศไทย จำกัด", jobPosition: "ช่างตรวจเช็คระยะยานยนต์", salaryRange: "15,001 - 25,000", jobMajorMatch: "ตรงสาย" },
      { studentId: "64309010008", fullName: "นายสุรชัย คำหล้า", educationLevel: "ปวส.", faculty: "ช่างอุตสาหกรรม", major: "ช่างยนต์", gradYear: 2567, gradTerm: "2", trackingStatus: "มีงานทำ", furtherStudyLevel: "", instituteName: "", studyMajorMatch: "", companyName: "บริษัท โตโยต้า มอเตอร์ ประเทศไทย จำกัด", jobPosition: "ช่างเทคนิคยานยนต์", salaryRange: "15,001 - 25,000", jobMajorMatch: "ตรงสาย" },
      { studentId: "64309010009", fullName: "นายเอกรินทร์ สมใจ", educationLevel: "ปวส.", faculty: "ช่างอุตสาหกรรม", major: "ช่างยนต์", gradYear: 2567, gradTerm: "2", trackingStatus: "มีงานทำ", furtherStudyLevel: "", instituteName: "", studyMajorMatch: "", companyName: "บริษัท ฮอนด้า ออโตโมบิล (ประเทศไทย) จำกัด", jobPosition: "ช่างยนต์และศูนย์บริการ", salaryRange: "9,001 - 15,000", jobMajorMatch: "ตรงสาย" },
      { studentId: "64309010010", fullName: "นางสาวศศิธร เจริญผล", educationLevel: "ปวส.", faculty: "พาณิชยกรรม", major: "การบัญชี", gradYear: 2567, gradTerm: "2", trackingStatus: "มีงานทำ", furtherStudyLevel: "", instituteName: "", studyMajorMatch: "", companyName: "บริษัท เบทาโกร จำกัด (มหาชน)", jobPosition: "เจ้าหน้าที่บัญชีลูกหนี้", salaryRange: "15,001 - 25,000", jobMajorMatch: "ตรงสาย" },
      { studentId: "64309010011", fullName: "นางสาวพรทิพย์ สุวรรณมาศ", educationLevel: "ปวส.", faculty: "พาณิชยกรรม", major: "การบัญชี", gradYear: 2567, gradTerm: "2", trackingStatus: "มีงานทำ", furtherStudyLevel: "", instituteName: "", studyMajorMatch: "", companyName: "บริษัท เซ็นทรัลพัฒนา จำกัด (มหาชน)", jobPosition: "พนักงานบัญชีและการเงิน", salaryRange: "15,001 - 25,000", jobMajorMatch: "ตรงสาย" },
      { studentId: "64309010012", fullName: "นายดนัย เทพรักษา", educationLevel: "ปวส.", faculty: "พาณิชยกรรม", major: "การตลาด", gradYear: 2567, gradTerm: "2", trackingStatus: "มีงานทำ", furtherStudyLevel: "", instituteName: "", studyMajorMatch: "", companyName: "บริษัท ไมเนอร์ ฟู้ด กรุ๊ป จำกัด (มหาชน)", jobPosition: "พนักงานบริการและประสานงานขาย", salaryRange: "9,001 - 15,000", jobMajorMatch: "ไม่ตรงสาย" },
      { studentId: "64309010013", fullName: "นายชินวัตร แก้วแก้ว", educationLevel: "ปวส.", faculty: "ช่างอุตสาหกรรม", major: "ช่างอิเล็กทรอนิกส์", gradYear: 2567, gradTerm: "2", trackingStatus: "มีงานทำ", furtherStudyLevel: "", instituteName: "", studyMajorMatch: "", companyName: "บริษัท เวสเทิร์น ดิจิตอล (ประเทศไทย) จำกัด", jobPosition: "Technician Operator", salaryRange: "15,001 - 25,000", jobMajorMatch: "ตรงสาย" },
      { studentId: "64309010014", fullName: "นายธีระศักดิ์ ยิ้มแย้ม", educationLevel: "ปวส.", faculty: "ช่างอุตสาหกรรม", major: "ช่างอิเล็กทรอนิกส์", gradYear: 2567, gradTerm: "2", trackingStatus: "มีงานทำ", furtherStudyLevel: "", instituteName: "", studyMajorMatch: "", companyName: "บริษัท เวสเทิร์น ดิจิตอล (ประเทศไทย) จำกัด", jobPosition: "Quality Assurance Technician", salaryRange: "15,001 - 25,000", jobMajorMatch: "ตรงสาย" },
      { studentId: "64309010015", fullName: "นายพงศกร สดใส", educationLevel: "ปวส.", faculty: "พาณิชยกรรม", major: "การจัดการทั่วไป", gradYear: 2567, gradTerm: "2", trackingStatus: "ว่างงาน", furtherStudyLevel: "", instituteName: "", studyMajorMatch: "", companyName: "", jobPosition: "", salaryRange: "", jobMajorMatch: "" },
      { studentId: "64309010016", fullName: "นายเกียรติศักดิ์ พูลผล", educationLevel: "ปวช.", faculty: "ช่างอุตสาหกรรม", major: "ช่างไฟฟ้ากำลัง", gradYear: 2567, gradTerm: "2", trackingStatus: "เกณฑ์ทหาร", furtherStudyLevel: "", instituteName: "", studyMajorMatch: "", companyName: "", jobPosition: "", salaryRange: "", jobMajorMatch: "" },
    ];

    for (const r of sampleGraduates) {
      await prisma.graduateTracking.create({ data: r });
    }
  }

  await prisma.uploadLog.create({
    data: {
      fileName: "system_initial_seed.xlsx",
      fileType: "profile_status",
      recordCount: await prisma.studentProfileStatus.count(),
      status: "SUCCESS",
      message: "ระบบโหลดข้อมูลเริ่มต้นและตัวอย่างเรียบร้อย",
      uploadedBy: "System Seeder",
    },
  });

  console.log("🎉 Database seeding finished!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
