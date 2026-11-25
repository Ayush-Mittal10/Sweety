import { formatDateRange } from '../utils/dates';

// One report: highest, lowest, average and count for a date range.
// `children` is used by the daily report to list its readings.
function ReportCard({ title, report, emptyMessage, children }) {
  const isEmpty = report.count === 0;

  return (
    <section className="card report-card">
      <h2>{title}</h2>
      <p className="muted report-range">{formatDateRange(report.from, report.to)}</p>

      {isEmpty ? (
        <p className="empty-state">{emptyMessage}</p>
      ) : (
        <>
          <dl className="stats">
            <div>
              <dt>Highest</dt>
              <dd>{report.highest}</dd>
            </div>
            <div>
              <dt>Lowest</dt>
              <dd>{report.lowest}</dd>
            </div>
            <div>
              <dt>Average</dt>
              <dd>{report.average.toFixed(1)}</dd>
            </div>
            <div>
              <dt>Readings</dt>
              <dd>{report.count}</dd>
            </div>
          </dl>
          <p className="muted stats-unit">Values in mg/dl</p>
          {children}
        </>
      )}
    </section>
  );
}

export default ReportCard;
