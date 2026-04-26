import jsPDF from 'jspdf';

/**
 * Generates a clean attendance report PDF using jsPDF
 * @param {Array} subjects - Array of subject objects
 * @param {string} userName - User's display name
 * @param {string} userEmail - User's email
 */
export const generateAttendancePDF = (subjects, userName = '', userEmail = '') => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  // ── Header block ──────────────────────────────────────────────
  doc.setFillColor(0, 0, 0);
  doc.rect(0, 0, pageW, 38, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('TRACKIFY', 14, 16);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Attendance Report', 14, 24);

  const genDate = new Date().toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
  doc.text(`Generated: ${genDate}`, pageW - 14, 16, { align: 'right' });
  if (userName) doc.text(userName, pageW - 14, 24, { align: 'right' });
  if (userEmail) doc.text(userEmail, pageW - 14, 30, { align: 'right' });

  // ── Summary ───────────────────────────────────────────────────
  let y = 52;
  const totalAttended = subjects.reduce((a, s) => a + (s.attendedClasses || 0), 0);
  const totalClasses = subjects.reduce((a, s) => a + (s.totalClasses || 0), 0);
  const overallPct = totalClasses === 0 ? 0 : Math.round((totalAttended / totalClasses) * 100);
  const safeCount = subjects.filter(s => {
    const pct = s.totalClasses === 0 ? 0 : (s.attendedClasses / s.totalClasses) * 100;
    return pct >= (s.threshold || 75);
  }).length;

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Overall Summary', 14, y);

  y += 6;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(
    `Subjects: ${subjects.length}   |   Attended: ${totalAttended}/${totalClasses}   |   Overall: ${overallPct}%   |   Safe: ${safeCount}/${subjects.length}`,
    14, y
  );

  // ── Overall progress bar ──────────────────────────────────────
  y += 6;
  doc.setFillColor(230, 230, 230);
  doc.roundedRect(14, y, pageW - 28, 4, 2, 2, 'F');
  const barColor = overallPct >= 75 ? [34, 197, 94] : [239, 68, 68];
  doc.setFillColor(...barColor);
  doc.roundedRect(14, y, (pageW - 28) * (overallPct / 100), 4, 2, 2, 'F');

  // ── Table ─────────────────────────────────────────────────────
  y += 14;
  const colX   = [14,   95,  113, 128, 143, 162];
  const headers = ['Subject', 'Credits', 'Attended', 'Total', '%', 'Status'];
  const rowH = 8;

  // Table header
  doc.setFillColor(0, 0, 0);
  doc.rect(14, y - 5.5, pageW - 28, rowH + 1, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  headers.forEach((h, i) => doc.text(h, colX[i], y));

  y += rowH;

  // Table rows
  subjects.forEach((sub, idx) => {
    const pct = sub.totalClasses === 0 ? 0 : Math.round((sub.attendedClasses / sub.totalClasses) * 100);
    const isSafe = pct >= (sub.threshold || 75);

    // Alternating row background
    if (idx % 2 === 0) {
      doc.setFillColor(248, 248, 248);
      doc.rect(14, y - 5.5, pageW - 28, rowH + 1, 'F');
    }

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');

    // Subject name (truncate if too long)
    const name = sub.name.length > 36 ? sub.name.slice(0, 36) + '…' : sub.name;
    doc.text(name, colX[0], y);
    doc.text(String(sub.credits || 0), colX[1], y);
    doc.text(String(sub.attendedClasses || 0), colX[2], y);
    doc.text(String(sub.totalClasses || 0), colX[3], y);
    doc.text(`${pct}%`, colX[4], y);

    // Status badge
    doc.setTextColor(...(isSafe ? [22, 163, 74] : [220, 38, 38]));
    doc.setFont('helvetica', 'bold');
    doc.text(isSafe ? '✓ Safe' : '✗ At Risk', colX[5], y);

    y += rowH + 1;

    // Page break
    if (y > pageH - 20) {
      doc.addPage();
      y = 20;
    }
  });

  // ── Footer ────────────────────────────────────────────────────
  doc.setTextColor(180, 180, 180);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Trackify • Attendance Manager  |  ${genDate}`,
    pageW / 2, pageH - 8, { align: 'center' }
  );

  // ── Save ──────────────────────────────────────────────────────
  const filename = `Trackify_Attendance_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
};
