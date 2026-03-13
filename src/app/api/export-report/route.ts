import { NextRequest, NextResponse } from 'next/server';

// Flexible interface that matches client data
interface MinuteData {
  timestamp: string;
  date: string;
  year: number;
  month: number;
  week: number;
  day: number;
  hour: number;
  minute: number;
  solarKW: number;
  homeLoadKW: number;
  ev1LoadKW: number;
  ev2LoadKW: number;
  batteryPowerKW: number;
  batteryLevelPct: number;
  gridImportKW: number;
  gridExportKW: number;
  ev1SocPct: number;
  ev2SocPct: number;
  tariffRate: number;
  isPeakTime: boolean;
  savingsKES: number;
  solarEnergyKWh: number;
  gridImportKWh: number;
  gridExportKWh: number;
}

interface AggregatedData {
  period: string;
  totalSolarKWh: number;
  totalHomeLoadKWh: number;
  totalEV1LoadKWh: number;
  totalEV2LoadKWh: number;
  totalGridImportKWh: number;
  totalGridExportKWh: number;
  avgBatteryLevelPct: number;
  avgEV1SocPct: number;
  avgEV2SocPct: number;
  totalSavingsKES: number;
  peakHoursCount: number;
  offPeakHoursCount: number;
}

function aggregateData(
  minuteData: MinuteData[],
  periodKey: (d: MinuteData) => string
): AggregatedData[] {
  const groups = new Map<string, MinuteData[]>();
  
  minuteData.forEach(d => {
    const key = periodKey(d);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(d);
  });

  return Array.from(groups.entries()).map(([period, items]) => {
    const count = items.length;
    return {
      period,
      totalSolarKWh: items.reduce((sum, d) => sum + (d.solarEnergyKWh || 0), 0),
      totalHomeLoadKWh: items.reduce((sum, d) => sum + ((d.homeLoadKW || 0) * 5/60/60), 0),
      totalEV1LoadKWh: items.reduce((sum, d) => sum + ((d.ev1LoadKW || 0) * 5/60/60), 0),
      totalEV2LoadKWh: items.reduce((sum, d) => sum + ((d.ev2LoadKW || 0) * 5/60/60), 0),
      totalGridImportKWh: items.reduce((sum, d) => sum + (d.gridImportKWh || 0), 0),
      totalGridExportKWh: items.reduce((sum, d) => sum + (d.gridExportKWh || 0), 0),
      avgBatteryLevelPct: count > 0 ? items.reduce((sum, d) => sum + (d.batteryLevelPct || 0), 0) / count : 0,
      avgEV1SocPct: count > 0 ? items.reduce((sum, d) => sum + (d.ev1SocPct || 0), 0) / count : 0,
      avgEV2SocPct: count > 0 ? items.reduce((sum, d) => sum + (d.ev2SocPct || 0), 0) / count : 0,
      totalSavingsKES: items.reduce((sum, d) => sum + (d.savingsKES || 0), 0),
      peakHoursCount: items.filter(d => d.isPeakTime).length,
      offPeakHoursCount: items.filter(d => !d.isPeakTime).length,
    };
  }).sort((a, b) => a.period.localeCompare(b.period));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { minuteData, startDate } = body as { minuteData: MinuteData[], startDate: string };

    if (!minuteData || !Array.isArray(minuteData) || minuteData.length === 0) {
      return NextResponse.json({ 
        error: 'No data to export. Run simulation first to collect data.' 
      }, { status: 400 });
    }

    // Aggregate data by different time periods
    const hourlyData = aggregateData(minuteData, d => `${d.date} ${String(d.hour).padStart(2, '0')}:00`);
    const dailyData = aggregateData(minuteData, d => d.date);
    const weeklyData = aggregateData(minuteData, d => `${d.year}-W${String(d.week).padStart(2, '0')}`);
    const monthlyData = aggregateData(minuteData, d => `${d.year}-${String(d.month).padStart(2, '0')}`);
    const yearlyData = aggregateData(minuteData, d => String(d.year));

    // Calculate totals
    const totalSolar = minuteData.reduce((sum, d) => sum + (d.solarEnergyKWh || 0), 0);
    const totalGridImport = minuteData.reduce((sum, d) => sum + (d.gridImportKWh || 0), 0);
    const totalGridExport = minuteData.reduce((sum, d) => sum + (d.gridExportKWh || 0), 0);
    const totalSavings = minuteData.reduce((sum, d) => sum + (d.savingsKES || 0), 0);
    const totalHomeLoad = minuteData.reduce((sum, d) => sum + ((d.homeLoadKW || 0) * 5/60/60), 0);
    const totalEV1Load = minuteData.reduce((sum, d) => sum + ((d.ev1LoadKW || 0) * 5/60/60), 0);
    const totalEV2Load = minuteData.reduce((sum, d) => sum + ((d.ev2LoadKW || 0) * 5/60/60), 0);
    const totalLoad = totalHomeLoad + totalEV1Load + totalEV2Load;
    
    // Get unique counts
    const uniqueDays = new Set(minuteData.map(d => d.date)).size;
    const uniqueWeeks = new Set(minuteData.map(d => `${d.year}-W${d.week}`)).size;
    const uniqueMonths = new Set(minuteData.map(d => `${d.year}-${d.month}`)).size;
    const uniqueYears = new Set(minuteData.map(d => d.year)).size;
    const peakCount = minuteData.filter(d => d.isPeakTime).length;
    const offPeakCount = minuteData.filter(d => !d.isPeakTime).length;

    // Create CSV content (Excel-compatible)
    let csv = '';

    // Header
    csv += 'SAFARICHARGE ENERGY REPORT\n';
    csv += `Generated,${new Date().toISOString()}\n`;
    csv += `System Start Date,${startDate || 'Unknown'}\n`;
    csv += `Total Data Points,${minuteData.length}\n`;
    csv += `Date Range,${minuteData[0]?.date || 'N/A'},to,${minuteData[minuteData.length - 1]?.date || 'N/A'}\n\n`;

    // Overall Summary
    csv += 'OVERALL SUMMARY\n';
    csv += 'Metric,Value,Unit\n';
    csv += `Total Solar Generated,${totalSolar.toFixed(2)},kWh\n`;
    csv += `Total Home Load,${totalHomeLoad.toFixed(2)},kWh\n`;
    csv += `Total EV1 Load,${totalEV1Load.toFixed(2)},kWh\n`;
    csv += `Total EV2 Load,${totalEV2Load.toFixed(2)},kWh\n`;
    csv += `Total Grid Import,${totalGridImport.toFixed(2)},kWh\n`;
    csv += `Total Grid Export,${totalGridExport.toFixed(2)},kWh\n`;
    csv += `Total Savings,${totalSavings.toFixed(2)},KES\n`;
    csv += `Net Energy,${(totalSolar - totalGridImport + totalGridExport).toFixed(2)},kWh\n`;
    csv += `Self-Sufficiency Rate,${totalLoad > 0 ? ((totalSolar / totalLoad) * 100).toFixed(1) : 0},%\n`;
    csv += `Unique Days Tracked,${uniqueDays},days\n`;
    csv += `Unique Weeks Tracked,${uniqueWeeks},weeks\n`;
    csv += `Unique Months Tracked,${uniqueMonths},months\n`;
    csv += `Unique Years Tracked,${uniqueYears},years\n`;
    csv += `Peak Time Records,${peakCount},records\n`;
    csv += `Off-Peak Time Records,${offPeakCount},records\n\n`;

    // Minute-by-Minute Data
    csv += 'MINUTE-BY-MINUTE DATA\n';
    csv += 'Timestamp,Date,Year,Month,Week,Day,Hour,Minute,Solar (kW),Home Load (kW),EV1 Load (kW),EV2 Load (kW),Battery Power (kW),Battery Level (%),Grid Import (kW),Grid Export (kW),EV1 SoC (%),EV2 SoC (%),Tariff Rate (KES/kWh),Peak Time,Savings (KES),Solar Energy (kWh),Grid Import (kWh),Grid Export (kWh)\n';
    
    minuteData.forEach(d => {
      csv += `${d.timestamp},${d.date},${d.year},${d.month},${d.week},${d.day},${d.hour},${d.minute},${(d.solarKW || 0).toFixed(2)},${(d.homeLoadKW || 0).toFixed(2)},${(d.ev1LoadKW || 0).toFixed(2)},${(d.ev2LoadKW || 0).toFixed(2)},${(d.batteryPowerKW || 0).toFixed(2)},${(d.batteryLevelPct || 0).toFixed(1)},${(d.gridImportKW || 0).toFixed(2)},${(d.gridExportKW || 0).toFixed(2)},${(d.ev1SocPct || 0).toFixed(1)},${(d.ev2SocPct || 0).toFixed(1)},${(d.tariffRate || 0).toFixed(2)},${d.isPeakTime ? 'Yes' : 'No'},${(d.savingsKES || 0).toFixed(2)},${(d.solarEnergyKWh || 0).toFixed(4)},${(d.gridImportKWh || 0).toFixed(4)},${(d.gridExportKWh || 0).toFixed(4)}\n`;
    });
    csv += '\n';

    // Aggregated sections helper
    const writeSection = (title: string, data: AggregatedData[], periodLabel: string) => {
      csv += `${title}\n`;
      csv += `${periodLabel},Total Solar (kWh),Total Home Load (kWh),Total EV1 Load (kWh),Total EV2 Load (kWh),Grid Import (kWh),Grid Export (kWh),Avg Battery (%),Avg EV1 SoC (%),Avg EV2 SoC (%),Savings (KES),Peak Count,Off-Peak Count\n`;
      data.forEach(d => {
        csv += `${d.period},${d.totalSolarKWh.toFixed(2)},${d.totalHomeLoadKWh.toFixed(2)},${d.totalEV1LoadKWh.toFixed(2)},${d.totalEV2LoadKWh.toFixed(2)},${d.totalGridImportKWh.toFixed(2)},${d.totalGridExportKWh.toFixed(2)},${d.avgBatteryLevelPct.toFixed(1)},${d.avgEV1SocPct.toFixed(1)},${d.avgEV2SocPct.toFixed(1)},${d.totalSavingsKES.toFixed(2)},${d.peakHoursCount},${d.offPeakHoursCount}\n`;
      });
      csv += '\n';
    };

    writeSection('HOURLY SUMMARY', hourlyData, 'Period');
    writeSection('DAILY SUMMARY', dailyData, 'Date');
    writeSection('WEEKLY SUMMARY', weeklyData, 'Week');
    writeSection('MONTHLY SUMMARY', monthlyData, 'Month');
    writeSection('YEARLY SUMMARY', yearlyData, 'Year');

    // Return CSV
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="SafariCharge_Report_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });

  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ 
      error: 'Failed to generate report', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
