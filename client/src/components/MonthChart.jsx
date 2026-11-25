import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatDate, toISODate } from '../utils/dates';

// Commonly used target range for blood glucose (mg/dl)
const TARGET_LOW = 70;
const TARGET_HIGH = 180;

// The API only returns days that have readings. Fill in every day of the
// range so empty days show up as gaps instead of the line jumping over them.
function buildChartData(byDay, from, to) {
  const readingsByDate = Object.fromEntries(byDay.map((day) => [day.date, day]));

  const [year, month, firstDay] = from.split('-').map(Number);
  const lastDay = Number(to.split('-')[2]);
  const data = [];

  for (let day = firstDay; day <= lastDay; day++) {
    const date = toISODate(new Date(year, month - 1, day));
    const summary = readingsByDate[date];
    data.push({
      date,
      day,
      average: summary ? summary.average : null,
      // Recharts draws an Area between two values when given [low, high]
      range: summary ? [summary.lowest, summary.highest] : null,
    });
  }
  return data;
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;

  return (
    <div className="chart-tooltip">
      <strong>{formatDate(point.date)}</strong>
      {point.average === null ? (
        <div className="muted">No readings</div>
      ) : (
        <>
          <div>Average: {point.average.toFixed(1)} mg/dl</div>
          <div className="muted">
            Range: {point.range[0]} – {point.range[1]} mg/dl
          </div>
        </>
      )}
    </div>
  );
}

function MonthChart({ byDay, from, to }) {
  const data = buildChartData(byDay, from, to);
  const highest = Math.max(...byDay.map((day) => day.highest));
  // round the top of the axis up to the next 50, and always show the target band
  const yMax = Math.max(250, Math.ceil(highest / 50) * 50);
  const yTicks = [];
  for (let tick = 50; tick <= yMax; tick += 50) yTicks.push(tick);

  return (
    <div className="chart" role="img" aria-label="Line chart of daily average glucose for the month">
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
          <CartesianGrid stroke="#e2e5ea" vertical={false} />
          <ReferenceArea y1={TARGET_LOW} y2={TARGET_HIGH} fill="#2b8a3e" fillOpacity={0.07} />
          <XAxis dataKey="day" tickLine={false} axisLine={{ stroke: '#e2e5ea' }} fontSize={12} />
          <YAxis
            domain={[40, yMax]}
            ticks={yTicks}
            tickLine={false}
            axisLine={false}
            fontSize={12}
          />
          <Tooltip content={<ChartTooltip />} />
          <Area
            dataKey="range"
            stroke="none"
            fill="#d6336c"
            fillOpacity={0.12}
            isAnimationActive={false}
          />
          <Line
            dataKey="average"
            stroke="#d6336c"
            strokeWidth={2}
            dot={{ r: 3, fill: '#d6336c' }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="chart-legend">
        <span>
          <i className="legend-line" /> Daily average
        </span>
        <span>
          <i className="legend-band" /> Lowest to highest
        </span>
        <span>
          <i className="legend-target" /> Target range ({TARGET_LOW}–{TARGET_HIGH} mg/dl)
        </span>
      </div>
    </div>
  );
}

export default MonthChart;
