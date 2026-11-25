import { SLOTS } from '../utils/readings';
import ReadingForm from './ReadingForm';

// Shows all four slots for one day, so it's easy to see which are still empty.
// The reading being edited is replaced by an inline form.
function ReadingList({ readings, editingId, onEdit, onCancelEdit, onSave, onDelete }) {
  const bySlot = Object.fromEntries(readings.map((reading) => [reading.slot, reading]));

  return (
    <table className="reading-table">
      <thead>
        <tr>
          <th>Time slot</th>
          <th>Value</th>
          <th>
            <span className="visually-hidden">Actions</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {SLOTS.map((slot) => {
          const reading = bySlot[slot.value];

          if (reading && reading.id === editingId) {
            return (
              <tr key={slot.value} className="editing-row">
                <td colSpan={3}>
                  <ReadingForm
                    initialValues={{ date: reading.date, slot: reading.slot, value: String(reading.value) }}
                    submitLabel="Save changes"
                    onSubmit={onSave}
                    onCancel={onCancelEdit}
                  />
                </td>
              </tr>
            );
          }

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
              <td className="row-actions">
                {reading && (
                  <>
                    <button type="button" className="button-link" onClick={() => onEdit(reading)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="button-link danger"
                      onClick={() => onDelete(reading)}
                    >
                      Delete
                    </button>
                  </>
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
