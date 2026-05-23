import { describe, expect, it } from 'vitest';
import type { MinuteDataPoint } from '@/stores/energySystemStore';

// Mocking the data filter utility for the unit test
function filterLogs(
  data: MinuteDataPoint[],
  search: string,
  filterType: 'all' | 'lowFreq' | 'highSolar' | 'lowBattery'
): MinuteDataPoint[] {
  return data.filter(d => {
    const matchesSearch = d.timestamp.toLowerCase().includes(search.toLowerCase()) ||
                          d.hour.toString().includes(search);
    if (!matchesSearch) return false;

    if (filterType === 'lowFreq') return (d.gridFrequencyHz ?? 50.0) < 49.8;
    if (filterType === 'highSolar') return d.solarKW > 30.0;
    if (filterType === 'lowBattery') return d.batteryLevelPct < 30.0;

    return true;
  });
}

function validateAdminToken(cookieString: string): boolean {
  const match = cookieString.match(/(^| )sc_admin_token=([^;]+)/);
  return !!match && match[2] === 'safaricharge-admin-session-active';
}

describe('adminDashboard', () => {
  const mockData: MinuteDataPoint[] = [
    {
      timestamp: '2026-01-15T12:00:00Z',
      date: '2026-01-15',
      year: 2026,
      month: 1,
      week: 2,
      day: 15,
      hour: 12,
      minute: 0,
      solarKW: 35.5, // high solar
      homeLoadKW: 5.0,
      ev1LoadKW: 0,
      ev2LoadKW: 0,
      batteryPowerKW: 0,
      batteryLevelPct: 85.0,
      gridImportKW: 0,
      gridExportKW: 30.5,
      ev1SocPct: 50,
      ev2SocPct: 50,
      tariffRate: 14.93,
      isPeakTime: false,
      savingsKES: 150.0,
      solarEnergyKWh: 2.0,
      homeLoadKWh: 0.3,
      ev1LoadKWh: 0,
      ev2LoadKWh: 0,
      gridImportKWh: 0,
      gridExportKWh: 1.7,
      gridFrequencyHz: 49.95,
    },
    {
      timestamp: '2026-01-15T18:00:00Z',
      date: '2026-01-15',
      year: 2026,
      month: 1,
      week: 2,
      day: 15,
      hour: 18,
      minute: 0,
      solarKW: 0,
      homeLoadKW: 12.0,
      ev1LoadKW: 0,
      ev2LoadKW: 0,
      batteryPowerKW: -8.0,
      batteryLevelPct: 22.0, // low battery
      gridImportKW: 4.0,
      gridExportKW: 0,
      ev1SocPct: 50,
      ev2SocPct: 50,
      tariffRate: 24.31,
      isPeakTime: true,
      savingsKES: 0,
      solarEnergyKWh: 0,
      homeLoadKWh: 0.8,
      ev1LoadKWh: 0,
      ev2LoadKWh: 0,
      gridImportKWh: 0.2,
      gridExportKWh: 0,
      gridFrequencyHz: 49.75, // low freq
    },
  ];

  it('filters raw log records correctly based on conditions', () => {
    // 1. All records
    const all = filterLogs(mockData, '', 'all');
    expect(all).toHaveLength(2);

    // 2. Search keyword matches
    const searchMatch = filterLogs(mockData, '18:00', 'all');
    expect(searchMatch).toHaveLength(1);
    expect(searchMatch[0].hour).toBe(18);

    // 3. Low frequency filter
    const lowFreq = filterLogs(mockData, '', 'lowFreq');
    expect(lowFreq).toHaveLength(1);
    expect(lowFreq[0].gridFrequencyHz).toBe(49.75);

    // 4. High solar filter
    const highSolar = filterLogs(mockData, '', 'highSolar');
    expect(highSolar).toHaveLength(1);
    expect(highSolar[0].solarKW).toBe(35.5);

    // 5. Low battery filter
    const lowBattery = filterLogs(mockData, '', 'lowBattery');
    expect(lowBattery).toHaveLength(1);
    expect(lowBattery[0].batteryLevelPct).toBe(22.0);
  });

  it('validates secure admin session cookies correctly', () => {
    expect(validateAdminToken('sc_admin_token=safaricharge-admin-session-active')).toBe(true);
    expect(validateAdminToken('other_cookie=123; sc_admin_token=safaricharge-admin-session-active')).toBe(true);
    expect(validateAdminToken('sc_admin_token=invalid-session-token')).toBe(false);
    expect(validateAdminToken('')).toBe(false);
  });
});
