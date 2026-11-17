import admin from "firebase-admin";
import ExcelJS from "exceljs";
import nodemailer from "nodemailer";
import { pathToFileURL } from "node:url";

const ZONE = "Europe/Madrid";
const DATABASE_URL = "https://partes-trabajo-erdella-default-rtdb.europe-west1.firebasedatabase.app";

function localIsoDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: ZONE, year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(date);
  const values = Object.fromEntries(parts.filter(part => part.type !== "literal").map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}
function addDays(iso, days) {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
export function previousCompleteWeek(todayIso) {
  const date = new Date(`${todayIso}T12:00:00Z`);
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  const currentMonday = addDays(todayIso, -daysSinceMonday);
  return { start: addDays(currentMonday, -7), end: addDays(currentMonday, -1) };
}
function minutesBetween(start, end) {
  if (!start || !end) return "";
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let minutes = (eh * 60 + em) - (sh * 60 + sm);
  if (minutes < 0) minutes += 1440;
  return minutes;
}
function distance(service) {
  return Number(service.endKm || 0) - Number(service.startKm || 0);
}
export async function workbookBuffer(records) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Partes de trabajo Erdella";
  const sheet = workbook.addWorksheet("Partes semanales", { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = [
    ["FECHA", "date", 13], ["TRABAJADOR", "worker", 34], ["LÍNEA", "line", 10],
    ["MATRÍCULA", "vehicle", 18], ["TIPO DE CAMIÓN", "vehicleType", 22], ["RUTA", "route", 34],
    ["HORA INICIO", "startTime", 14], ["HORA FIN", "endTime", 14], ["DURACIÓN (MIN)", "duration", 16],
    ["KM INICIALES", "startKm", 16], ["KM FINALES", "endKm", 16], ["KM REALIZADOS", "distance", 16],
    ["OBSERVACIONES", "notes", 34]
  ].map(([header, key, width]) => ({ header, key, width }));
  sheet.getRow(1).font = { bold: true, color: { argb: "FF111827" } };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF200" } };
  sheet.getRow(1).alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  sheet.autoFilter = "A1:M1";

  for (const record of records) {
    const services = record.vehicle === "Varios" && Array.isArray(record.services) && record.services.length ? record.services : [record];
    const totalKm = services.reduce((sum, service) => sum + distance(service), 0);
    sheet.addRow({
      date: record.date, worker: record.worker, line: "RESUMEN", vehicle: "", vehicleType: "", route: record.route,
      startTime: record.startTime, endTime: record.endTime, duration: minutesBetween(record.startTime, record.endTime),
      startKm: "", endKm: "", distance: totalKm, notes: record.notes || ""
    });
    services.forEach((service, index) => sheet.addRow({
      date: record.date, worker: record.worker, line: index + 1, vehicle: service.vehicle || "", vehicleType: service.vehicleType || "",
      route: service.route || "", startTime: service.startTime, endTime: service.endTime,
      duration: minutesBetween(service.startTime, service.endTime), startKm: service.startKm, endKm: service.endKm,
      distance: distance(service), notes: ""
    }));
  }
  return workbook.xlsx.writeBuffer();
}

async function main() {
  const required = ["FIREBASE_SERVICE_ACCOUNT", "SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD", "MAIL_FROM", "MAIL_TO"];
  for (const name of required) if (!process.env[name]) throw new Error(`Falta el secreto ${name}.`);
  const period = previousCompleteWeek(localIsoDate());
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount), databaseURL: DATABASE_URL });
  const database = admin.database();
  const forced = process.env.FORCE_SEND === "true";
  const devices = (await database.ref("sorayaDevices").once("value")).val() || {};
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 465),
    secure: Number(process.env.SMTP_PORT || 465) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
  });
  await transport.verify();
  let sent = 0;
  for (const [uid, device] of Object.entries(devices)) {
    const markerRef = database.ref(`weeklyExports/${period.start}/${uid}`);
    if (!forced && (await markerRef.once("value")).exists()) continue;
    const records = Object.values(device.records || {})
      .filter(record => record.date >= period.start && record.date <= period.end)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.startTime).localeCompare(String(b.startTime)));
    if (!records.length) continue;
    const workers = [...new Set(records.map(record => record.worker).filter(Boolean))];
    const deviceName = workers.join(", ") || device.metadata?.name || uid.slice(0, 8);
    const fileLabel = deviceName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 55);
    const content = await workbookBuffer(records);
    const info = await transport.sendMail({
      from: process.env.MAIL_FROM, to: process.env.MAIL_TO,
      subject: `Partes semanales · ${deviceName} · ${period.start} a ${period.end}`,
      text: `Se adjunta el Excel enviado por el dispositivo de ${deviceName}, con sus partes entre ${period.start} y ${period.end}.\n\nPartes incluidos: ${records.length}.`,
      attachments: [{ filename: `partes_${fileLabel}_${period.start}_${period.end}.xlsx`, content }]
    });
    await markerRef.set({ sentAt: admin.database.ServerValue.TIMESTAMP, end: period.end, records: records.length, messageId: info.messageId || "" });
    sent++;
  }
  console.log(`Informes enviados: ${sent}. Semana: ${period.start} a ${period.end}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
