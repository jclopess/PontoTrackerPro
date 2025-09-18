import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { User, TimeRecord, Justification, HourBank } from '../shared/schema';
import { eachDayOfInterval, format, getDay } from 'date-fns';

// Tipos e constantes
interface ReportData {
  user: User;
  timeRecords: TimeRecord[];
  month: string;
  approvedJustifications: Justification[];
  startDate: string;
  endDate: string;
  hourBank: Partial<HourBank>;
}

const justificationTypeLabels: { [key: string]: string } = {
  absence: "Falta",
  late: "Atraso",
  "early-leave": "Saída antecipada",
  error: "Erro no registro",
  vacation: "Férias",
  holiday: "Feriado",
  training: "Treinamento",
  "work-from-home": "Trabalho remoto",
  "health-problems": "Atestado Médico",
  "family-issue": "Licença Familiar",
  "external-meetings": "Reunião Externa",
  other: "Outros",
};

const PAGE_OPTIONS: PDFKit.PDFDocumentOptions = { margin: 40, size: 'A4' };
const FONT_NORMAL = 'Helvetica';
const FONT_BOLD = 'Helvetica-Bold';

// Funções auxiliares para gerar o PDF

/**
 * Converte horas decimais para o formato HH:MM.
 * @param decimalValue - As horas em formato decimal (ex: 8.5 para 8h 30m).
 * @returns Uma string no formato HH:MM.
 */
function decimalToHHMM(decimalValue: string | number | null | undefined): string {
  if (decimalValue === null || decimalValue === undefined) {
    return '00:00';
  }
  
  const decimalHours = typeof decimalValue === 'string' ? parseFloat(decimalValue) : decimalValue;

  // Trata saldos negativos para o banco de horas
  const sign = decimalHours < 0 ? "-" : "";
  const absDecimalHours = Math.abs(decimalHours);

  const hours = Math.floor(absDecimalHours);
  const minutesFraction = absDecimalHours - hours;
  const minutes = Math.round(minutesFraction * 60);

  // Preenche com zeros à esquerda
  const paddedHours = String(hours).padStart(2, '0');
  const paddedMinutes = String(minutes).padStart(2, '0');

  return `${sign}${paddedHours}:${paddedMinutes}`;
}

/**
 * Gera o cabeçalho do relatório.
 */
function generateHeader(doc: PDFKit.PDFDocument, data: ReportData) {
  const logoPath = path.resolve(process.cwd(), 'attached_assets', 'logo.png');
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, { fit: [80, 80], align: 'right', valign: 'top' });
  }

  const titleY = doc.y;
  doc.fontSize(16).font(FONT_BOLD).text('Relatório de Ponto', PAGE_OPTIONS.margin, titleY,{ align: 'center' });
  doc.moveDown(0.5);

  const reportMonth = new Date(`${data.month}-02T12:00:00Z`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const formattedStartDate = new Date(`${data.startDate}T12:00:00Z`).toLocaleDateString('pt-BR');
  const formattedEndDate = new Date(`${data.endDate}T12:00:00Z`).toLocaleDateString('pt-BR');

  const headerY = doc.y;
  doc.fontSize(10).font(FONT_NORMAL);
  doc.text(`Funcionário: ${data.user.name}`, PAGE_OPTIONS.margin, headerY);
  doc.text(`CPF: ${data.user.cpf}`, PAGE_OPTIONS.margin, headerY + 15);

  doc.font(FONT_BOLD);
  doc.text(`Mês de Referência: ${reportMonth.charAt(0).toUpperCase() + reportMonth.slice(1)}`, 50, headerY, { align: 'right'});
  doc.text(`Período: ${formattedStartDate} a ${formattedEndDate}`, 50, headerY + 15, { align: 'right'});
  doc.moveDown(0.5);
}

/**
 * Gera a tabela principal com os registros diários.
 */

function generateTable(doc: PDFKit.PDFDocument, data: ReportData) {
  doc.fontSize(12).font(FONT_BOLD).text('Registros Diários', { underline: true, align: 'center' });

  const tableTop = doc.y;
  const itemWidth = 75;
  const startX = PAGE_OPTIONS.margin;

  // Cabeçalho da tabela
  doc.fontSize(9).font(FONT_BOLD);
  doc.text('Data', startX, tableTop);
  doc.text('Entrada 1', startX + itemWidth, tableTop);
  doc.text('Saída 1', startX + itemWidth * 2, tableTop);
  doc.text('Entrada 2', startX + itemWidth * 3, tableTop);
  doc.text('Saída 2', startX + itemWidth * 4, tableTop);
  doc.text('Total Horas', startX + itemWidth * 5, tableTop, { width: itemWidth, align: 'right' });
  doc.moveDown(0.5);
  doc.strokeColor("#cccccc").lineWidth(1).moveTo(startX, doc.y).lineTo(doc.page.width - startX, doc.y).stroke();
  doc.moveDown(0.5);

  // Linhas da tabela
  const interval = {
    start: new Date(`${data.startDate}T12:00:00Z`),
    end: new Date(`${data.endDate}T12:00:00Z`)
  };
  const allDaysInPeriod = eachDayOfInterval(interval);

  allDaysInPeriod.forEach(day => {
    const dateString = format(day, 'yyyy-MM-dd');
    const dayOfWeek = getDay(day);

    const record = data.timeRecords.find(r => r.date === dateString);
    const justification = data.approvedJustifications.find(j => j.date === dateString);

    const rowY = doc.y;
    const formattedDate = format(day, 'dd/MM/yyyy');

    doc.font(FONT_NORMAL).fontSize(7);
    doc.text(formattedDate, startX, rowY);

    if (record) {
        const dailyHoursString = decimalToHHMM(record.totalHours); // <-- CORREÇÃO APLICADA
        const textOptions = { underline: record.isAdjusted, align: 'center' as const, width: itemWidth };

        doc.text(record.entry1 || '--:--', startX + itemWidth, rowY, textOptions);
        doc.text(record.exit1 || '--:--', startX + itemWidth * 2, rowY, textOptions);
        doc.text(record.entry2 || '--:--', startX + itemWidth * 3, rowY, textOptions);
        doc.text(record.exit2 || '--:--', startX + itemWidth * 4, rowY, textOptions);
        doc.text(dailyHoursString, startX + itemWidth * 5, rowY, { ...textOptions, align: 'right' });
    } else {
        let textToDisplay = "Sem registro";
        let color = "gray";

        if (justification) {
            const label = justificationTypeLabels[justification.type] || justification.type;
            textToDisplay = justification.abona_horas ? `${label} (Abonado)` : label;
            color = justification.type === 'holiday' ? 'red' : 'blue';
        } else if (dayOfWeek === 0 || dayOfWeek === 6) {
            textToDisplay = "Final de Semana";
        }
        
        doc.fillColor(color).text(textToDisplay, startX + itemWidth, rowY, { width: itemWidth * 4, align: 'center' }).fillColor('black');
    }
    doc.moveDown(0.75);
  });
}

/**
 * Gera o rodapé com o resumo e as assinaturas.
 */
function generateFooter(doc: PDFKit.PDFDocument, data: ReportData) {
    const footerY = doc.page.height - 150;
    const startX = PAGE_OPTIONS.margin;
    const rightAlignX = doc.page.width - PAGE_OPTIONS.margin;

    doc.strokeColor("#cccccc").lineWidth(1).moveTo(startX, footerY - 10).lineTo(rightAlignX, footerY - 10).stroke();

    doc.fontSize(12).font(FONT_BOLD).text('Resumo do Período', startX, footerY);
    
    doc.fontSize(10).font(FONT_NORMAL);
    doc.text(`Horas esperadas: ${decimalToHHMM(data.hourBank.expectedHours)}`, startX, footerY + 15);
    doc.text(`Horas trabalhadas: ${decimalToHHMM(data.hourBank.workedHours)}`, startX, footerY + 30);
    doc.font(FONT_BOLD).text(`Saldo do período: ${decimalToHHMM(data.hourBank.balance)}`, startX, footerY + 15,  { align: 'right'});
    doc.font(FONT_NORMAL).text(`Total de justificativas aprovadas: ${data.approvedJustifications.length}`, startX, footerY + 30, { align: 'right'});

    const signatureY = doc.page.height - 80;
    doc.fontSize(10).font(FONT_NORMAL);
    doc.text('__________________________________', startX, signatureY);
    doc.text(data.user.name, startX, signatureY + 15);
    doc.text('__________________________________', startX, signatureY, { align: 'right' });
    doc.text('Assinatura do Gestor', startX, signatureY + 15, { align: 'right' });
}


// --- Função Principal ---

export function generateMonthlyReportPDF(data: ReportData): Promise<Buffer> {
  return new Promise((resolve) => {
    const doc = new PDFDocument(PAGE_OPTIONS);
    const buffers: Buffer[] = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));

    // Estrutura do documento
    generateHeader(doc, data);
    generateTable(doc, data);
    generateFooter(doc, data);

    doc.end();
  });
}