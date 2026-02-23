import { fetchReportData } from "../services/analytics.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import { Parser } from 'json2csv';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * GET /api/v1/analytics/export/csv
 */
export const exportCSV = asyncHandler(async (req, res) => {
    const { start, end } = req.query;
    if (!start || !end) throw new ApiError(400, "Date range required");

    const { logs } = await fetchReportData(start, end);

    const fields = ['name', 'confidence', 'dominantEmotion', 'demographics.age', 'demographics.gender', 'createdAt'];
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(logs);

    res.header('Content-Type', 'text/csv');
    res.attachment(`Intelligence_Report_${start}_to_${end}.csv`);
    return res.send(csv);
});

/**
 * GET /api/v1/analytics/export/pdf
 */
export const exportPDF = asyncHandler(async (req, res) => {
    const { start, end } = req.query;
    if (!start || !end) throw new ApiError(400, "Date range required");

    const { logs } = await fetchReportData(start, end);
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Vision OS - Intelligence Audit Report", 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Period: ${start} to ${end}`, 14, 30);

    const tableRows = logs.map(l => [
        l.name,
        (l.confidence * 100).toFixed(0) + "%",
        l.dominantEmotion,
        `${l.demographics.gender}, ${l.demographics.age}`,
        new Date(l.createdAt).toLocaleString()
    ]);

    autoTable(doc, {
        head: [['Identity', 'Match', 'Sentiment', 'Demographics', 'Last Seen']],
        body: tableRows,
        startY: 40,
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235] }
    });

    const pdfBuffer = doc.output('arraybuffer');
    res.header('Content-Type', 'application/pdf');
    res.attachment(`Intelligence_Report_${start}_to_${end}.pdf`);
    return res.send(Buffer.from(pdfBuffer));
});
