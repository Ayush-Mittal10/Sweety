import { useState } from 'react';
import { SLOTS, validateReadingForm } from '../utils/readings';
import { todayISO } from '../utils/dates';

// a function, not a constant, so "today" is worked out when the form opens
function emptyReading() {
  return { date: todayISO(), slot: SLOTS[0].value, value: '' };
}

// Used for both adding and editing a reading.
// onSubmit should return a promise and throw an Error with a message on failure.
function ReadingForm({ initialValues, submitLabel = 'Add reading', onSubmit, onCancel }) {
  const [form, setForm] = useState(() => initialValues ?? emptyReading());
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const validationError = validateReadingForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      await onSubmit({ ...form, value: Number(form.value) });
      // keep date and slot, clear the value for the next entry
      setForm((current) => ({ ...current, value: '' }));
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    // noValidate: we show our own messages instead of the browser's tooltips
    <form className="reading-form" onSubmit={handleSubmit} noValidate>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <div className="reading-form-fields">
        <label className="field">
          <span>Date</span>
          <input type="date" name="date" value={form.date} max={todayISO()} onChange={updateField} />
        </label>

        <label className="field">
          <span>Time slot</span>
          <select name="slot" value={form.slot} onChange={updateField}>
            {SLOTS.map((slot) => (
              <option key={slot.value} value={slot.value}>
                {slot.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Value (mg/dl)</span>
          <input
            type="number"
            name="value"
            inputMode="numeric"
            step="1"
            placeholder="e.g. 110"
            value={form.value}
            onChange={updateField}
          />
        </label>
      </div>

      <div className="form-actions">
        <button type="submit" className="button" disabled={submitting}>
          {submitting ? 'Saving…' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="button button-secondary" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export default ReadingForm;
