import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { previousCompleteWeek, workbookBuffer } from "./send-weekly-report.mjs";

assert.deepEqual(previousCompleteWeek("2026-11-16"), { start: "2026-11-09", end: "2026-11-15" });
assert.deepEqual(previousCompleteWeek("2026-11-18"), { start: "2026-11-09", end: "2026-11-15" });

const records = [{
  id: "1", date: "2026-11-10", worker: "PRUEBA", vehicle: "Varios", route: "Varios trabajos",
  startTime: "07:00", endTime: "13:00", notes: "Bien", services: [
    { vehicle: "1234ABC", vehicleType: "Rigido", route: "Bilbao", startTime: "07:00", endTime: "09:00", startKm: 100, endKm: 130 },
    { vehicle: "5678DEF", vehicleType: "Trailer", route: "Vitoria", startTime: "10:00", endTime: "13:00", startKm: 200, endKm: 260 }
  ]
}];
const buffer = await workbookBuffer(records);
const workbook = new ExcelJS.Workbook();
await workbook.xlsx.load(buffer);
const sheet = workbook.getWorksheet("Partes semanales");
assert.equal(sheet.rowCount, 4);
assert.equal(sheet.getCell("L2").value, 90);
assert.equal(sheet.getCell("F4").value, "Vitoria");
console.log("Informe semanal comprobado correctamente.");
