import PDFDocument from 'pdfkit';
import type { HercmWeek, User } from '@shared/schema';

export function generateHRCMWeeklyPDF(
  user: User,
  weekData: HercmWeek,
  stream: NodeJS.WritableStream
): void {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  doc.pipe(stream);

  // Header
  doc.fontSize(24).fillColor('#1e40af').text('HRCM Weekly Report', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(12).fillColor('#6b7280').text(`${user.firstName} ${user.lastName}`, { align: 'center' });
  doc.text(user.email || '', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(14).fillColor('#374151').text(`Week ${weekData.weekNumber} - ${weekData.year}`, { align: 'center' });
  doc.moveDown(1);

  // Overall Summary Box
  doc.rect(50, doc.y, 495, 80).fillAndStroke('#eff6ff', '#3b82f6');
  const summaryY = doc.y + 15;
  doc.fontSize(11).fillColor('#1e40af').text('Overall Summary', 60, summaryY);
  doc.fontSize(10).fillColor('#374151');
  doc.text(`Overall Score: ${weekData.overallScore || 0}/5`, 60, summaryY + 25);
  doc.text(`Achievement Rate: ${weekData.achievementRate || 0}%`, 250, summaryY + 25);
  doc.text(`Status: ${weekData.weekStatus}`, 60, summaryY + 45);
  doc.moveDown(6);

  // HRCM Categories
  const categories = [
    { name: 'Health', prefix: 'health', color: '#10b981' },
    { name: 'Relationship', prefix: 'relationship', color: '#ec4899' },
    { name: 'Career', prefix: 'career', color: '#3b82f6' },
    { name: 'Money', prefix: 'money', color: '#f59e0b' }
  ];

  categories.forEach((cat) => {
    const prefix = cat.prefix as keyof Pick<HercmWeek, 'healthProblems' | 'relationshipProblems' | 'careerProblems' | 'moneyProblems'>;
    const currentRating = weekData[`current${cat.name === 'Health' ? 'H' : cat.name === 'Relationship' ? 'E' : cat.name === 'Career' ? 'R' : 'C'}` as keyof HercmWeek] as number || 0;
    const targetRating = weekData[`target${cat.name === 'Health' ? 'H' : cat.name === 'Relationship' ? 'E' : cat.name === 'Career' ? 'R' : 'C'}` as keyof HercmWeek] as number || 0;
    
    // Category Header
    doc.fontSize(14).fillColor(cat.color).text(cat.name, { underline: true });
    doc.moveDown(0.3);
    
    // Ratings
    doc.fontSize(10).fillColor('#374151');
    doc.text(`Current Rating: ${currentRating}/5`, { continued: true });
    doc.text(`  |  Target: ${targetRating}/5`);
    doc.moveDown(0.5);
    
    // Problems
    const problems = weekData[`${prefix}Problems` as keyof HercmWeek] as string || '';
    if (problems) {
      doc.fontSize(9).fillColor('#6b7280').text('Problems:', { continued: true });
      doc.fillColor('#374151').text(` ${problems}`);
      doc.moveDown(0.3);
    }
    
    // Current Feelings
    const feelings = weekData[`${prefix}CurrentFeelings` as keyof HercmWeek] as string || '';
    if (feelings) {
      doc.fontSize(9).fillColor('#6b7280').text('Feelings:', { continued: true });
      doc.fillColor('#374151').text(` ${feelings}`);
      doc.moveDown(0.3);
    }
    
    // Beliefs/Reasons
    const beliefs = weekData[`${prefix}CurrentBelief` as keyof HercmWeek] as string || '';
    if (beliefs) {
      doc.fontSize(9).fillColor('#6b7280').text('Beliefs:', { continued: true });
      doc.fillColor('#374151').text(` ${beliefs}`);
      doc.moveDown(0.3);
    }
    
    // Actions
    const actions = weekData[`${prefix}CurrentActions` as keyof HercmWeek] as string || '';
    if (actions) {
      doc.fontSize(9).fillColor('#6b7280').text('Actions:', { continued: true });
      doc.fillColor('#374151').text(` ${actions}`);
      doc.moveDown(0.3);
    }
    
    // Course Suggestion
    const course = weekData[`${prefix}CourseSuggestion` as keyof HercmWeek] as string || '';
    if (course) {
      doc.fontSize(9).fillColor('#6b7280').text('Course:', { continued: true });
      doc.fillColor('#3b82f6').text(` ${course}`, { link: course.startsWith('http') ? course : undefined });
      doc.moveDown(0.3);
    }
    
    doc.moveDown(0.8);
  });

  // Footer
  doc.fontSize(8).fillColor('#9ca3af').text(
    `Generated on ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} | Platinum HRCM Dashboard`,
    50,
    doc.page.height - 50,
    { align: 'center' }
  );

  doc.end();
}

export function generateMonthlyProgressPDF(
  user: User,
  monthlyWeeks: HercmWeek[],
  month: number,
  year: number,
  stream: NodeJS.WritableStream
): void {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  doc.pipe(stream);

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  
  // Header
  doc.fontSize(24).fillColor('#1e40af').text('Monthly Progress Report', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(12).fillColor('#6b7280').text(`${user.firstName} ${user.lastName}`, { align: 'center' });
  doc.text(user.email || '', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(16).fillColor('#374151').text(`${monthNames[month - 1]} ${year}`, { align: 'center' });
  doc.moveDown(1);

  // Calculate monthly stats
  const avgScore = monthlyWeeks.reduce((sum, w) => sum + (w.overallScore || 0), 0) / (monthlyWeeks.length || 1);
  const avgAchievement = monthlyWeeks.reduce((sum, w) => sum + (w.achievementRate || 0), 0) / (monthlyWeeks.length || 1);
  const isPlatinum = avgAchievement > 80;

  // Monthly Summary Box
  doc.rect(50, doc.y, 495, 100).fillAndStroke(isPlatinum ? '#fef3c7' : '#eff6ff', isPlatinum ? '#f59e0b' : '#3b82f6');
  const summaryY = doc.y + 15;
  
  if (isPlatinum) {
    doc.fontSize(16).fillColor('#f59e0b').text('🏆 PLATINUM STANDARDS ACHIEVED! 🏆', 60, summaryY, { align: 'center', width: 475 });
  } else {
    doc.fontSize(14).fillColor('#1e40af').text('Monthly Performance Summary', 60, summaryY);
  }
  
  doc.fontSize(10).fillColor('#374151');
  doc.text(`Weeks Completed: ${monthlyWeeks.length}`, 60, summaryY + (isPlatinum ? 35 : 30));
  doc.text(`Average Score: ${avgScore.toFixed(1)}/5`, 60, summaryY + (isPlatinum ? 55 : 50));
  doc.text(`Avg Achievement: ${avgAchievement.toFixed(0)}%`, 250, summaryY + (isPlatinum ? 35 : 30));
  doc.text(`Status: ${isPlatinum ? 'PLATINUM ⭐' : avgAchievement >= 60 ? 'Good' : 'Needs Improvement'}`, 250, summaryY + (isPlatinum ? 55 : 50));
  doc.moveDown(7);

  // Week-by-Week Breakdown
  doc.fontSize(14).fillColor('#374151').text('Week-by-Week Breakdown');
  doc.moveDown(0.5);

  monthlyWeeks.forEach((week) => {
    doc.fontSize(11).fillColor('#1e40af').text(`Week ${week.weekNumber}`, { underline: true });
    doc.fontSize(9).fillColor('#374151');
    doc.text(`Score: ${week.overallScore || 0}/5  |  Achievement: ${week.achievementRate || 0}%`);
    doc.moveDown(0.5);
  });

  // Footer
  doc.fontSize(8).fillColor('#9ca3af').text(
    `Generated on ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} | Platinum HRCM Dashboard`,
    50,
    doc.page.height - 50,
    { align: 'center' }
  );

  doc.end();
}
