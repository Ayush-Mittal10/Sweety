const { getReportRanges } = require('../src/utils/reportRanges');

describe('getReportRanges', () => {
  it('matches the example from the assignment (15 Oct 2026)', () => {
    expect(getReportRanges('2026-10-15')).toEqual({
      daily: { from: '2026-10-15', to: '2026-10-15' },
      monthToDate: { from: '2026-10-01', to: '2026-10-15' },
      previousMonth: { from: '2026-09-01', to: '2026-09-30' },
    });
  });

  it('goes back to December of the previous year in January', () => {
    expect(getReportRanges('2026-01-10').previousMonth).toEqual({
      from: '2025-12-01',
      to: '2025-12-31',
    });
  });

  it('handles February in a leap year', () => {
    expect(getReportRanges('2028-03-05').previousMonth.to).toBe('2028-02-29');
  });

  it('handles February in a normal year', () => {
    expect(getReportRanges('2026-03-05').previousMonth.to).toBe('2026-02-28');
  });

  it('uses the full previous month even when the selected day is the 31st', () => {
    // a naive "subtract one month" from 31 March would land on 3 March
    expect(getReportRanges('2026-03-31').previousMonth).toEqual({
      from: '2026-02-01',
      to: '2026-02-28',
    });
  });

  it('month-to-date on the 1st is just that day', () => {
    expect(getReportRanges('2026-11-01').monthToDate).toEqual({
      from: '2026-11-01',
      to: '2026-11-01',
    });
  });
});
