import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { api } from '../api';
import MonthChart from '../components/MonthChart';
import ReportCard from '../components/ReportCard';
import { formatDateRange, monthName, todayISO } from '../utils/dates';
import { slotLabel } from '../utils/readings';

function ReportsPage() {
  const [selectedDate, setSelectedDate] = useState(todayISO);
  const [reports, setReports] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;
    setError('');

    api
      .getReports(selectedDate)
      .then((data) => {
        if (!ignore) setReports(data);
      })
      .catch((err) => {
        if (!ignore) setError(err.message);
      });

    return () => {
      ignore = true;
    };
  }, [selectedDate]);

  return (
    <>
      <div className="section-header page-title">
        <h1>Reports</h1>
        <label className="field field-inline">
          <span>Date</span>
          <input
            type="date"
            value={selectedDate}
            max={todayISO()}
            onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
          />
        </label>
      </div>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {!reports && !error && <p className="muted">Loading reports…</p>}

      {reports && (
        <div className="report-grid">
          <ReportCard
            title="Daily"
            report={reports.daily}
            emptyMessage={
              <>
                No readings for this day. <Link to="/">Add one</Link>
              </>
            }
          >
            <ul className="report-readings">
              {reports.daily.readings.map((reading) => (
                <li key={reading.id}>
                  <span>{slotLabel(reading.slot)}</span>
                  <strong>{reading.value} mg/dl</strong>
                </li>
              ))}
            </ul>
          </ReportCard>

          <ReportCard
            title="Month to date"
            report={reports.monthToDate}
            emptyMessage="No readings so far this month."
          />

          <ReportCard
            title="Previous month"
            report={reports.previousMonth}
            emptyMessage={`No readings in ${monthName(reports.previousMonth.from)}.`}
          />
        </div>
      )}

      {reports && reports.monthToDate.count > 0 && (
        <section className="card chart-card">
          <h2>Month-to-date trend</h2>
          <p className="muted report-range">
            {formatDateRange(reports.monthToDate.from, reports.monthToDate.to)}
          </p>
          <MonthChart
            byDay={reports.monthToDate.byDay}
            from={reports.monthToDate.from}
            to={reports.monthToDate.to}
          />
        </section>
      )}
    </>
  );
}

export default ReportsPage;
