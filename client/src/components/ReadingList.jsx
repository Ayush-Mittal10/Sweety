import { SLOTS } from '../utils/readings';

// Shows all four slots for one day, so it's easy to see which are still empty
function ReadingList({ readings }) {
  const bySlot = Object.fromEntries(readings.map((reading) => [reading.slot, reading]));

  return (
    <table className="reading-table">
      <thead>
        <tr>
          <th>Time slot</th>
          <th>Value</th>
        </tr>
      </thead>
      <tbody>
        {SLOTS.map((slot) => {
          const reading = bySlot[slot.value];
          return (
            <tr key={slot.value}>
              <td>{slot.label}</td>
              <td>
                {reading ? (
                  <strong>{reading.value} mg/dl</strong>
                ) : (
                  <span className="muted">Not recorded</span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default ReadingList;
