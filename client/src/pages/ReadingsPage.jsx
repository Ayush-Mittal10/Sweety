import { useEffect, useState } from 'react';
import { api } from '../api';
import ReadingForm from '../components/ReadingForm';
import ReadingList from '../components/ReadingList';
import { formatDate, todayISO } from '../utils/dates';
import { slotLabel } from '../utils/readings';

function ReadingsPage() {
  const [selectedDate, setSelectedDate] = useState(todayISO);
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  // bumped after a change so the list fetches again
  const [reloadCount, setReloadCount] = useState(0);
  const [lastSaved, setLastSaved] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    // if the user switches dates quickly, ignore answers for the old date
    let ignore = false;
    setLoading(true);
    setLoadError('');
    setEditingId(null);

    api
      .listReadings(selectedDate)
      .then((data) => {
        if (!ignore) setReadings(data.readings);
      })
      .catch((err) => {
        if (!ignore) setLoadError(err.message);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [selectedDate, reloadCount]);

  async function handleCreate(reading) {
    // hide the previous success message so it doesn't sit next to a new error
    setLastSaved(null);
    const data = await api.createReading(reading);
    setLastSaved(data.reading);
    // show the day the reading was added to
    setSelectedDate(data.reading.date);
    setReloadCount((count) => count + 1);
  }

  async function handleUpdate(reading) {
    const data = await api.updateReading(editingId, reading);
    setEditingId(null);
    setSelectedDate(data.reading.date);
    setReloadCount((count) => count + 1);
  }

  async function handleDelete(reading) {
    const confirmed = window.confirm(
      `Delete the ${slotLabel(reading.slot)} reading (${reading.value} mg/dl) for ${formatDate(reading.date)}?`
    );
    if (!confirmed) return;

    setActionError('');
    setLastSaved(null);
    try {
      await api.deleteReading(reading.id);
      setReloadCount((count) => count + 1);
    } catch (err) {
      setActionError(err.message);
    }
  }

  function startEditing(reading) {
    setActionError('');
    setLastSaved(null);
    setEditingId(reading.id);
  }

  return (
    <>
      <h1 className="page-title">Readings</h1>

      <section className="card">
        <h2>Add a reading</h2>
        {lastSaved && (
          <p className="form-success" role="status">
            Saved {lastSaved.value} mg/dl for {slotLabel(lastSaved.slot)} on {formatDate(lastSaved.date)}.
          </p>
        )}
        <ReadingForm onSubmit={handleCreate} />
      </section>

      <section className="card">
        <div className="section-header">
          <h2>
            {formatDate(selectedDate)}
            {!loading && !loadError && (
              <span className="muted count-badge">{readings.length} of 4 recorded</span>
            )}
          </h2>
          <label className="field field-inline">
            <span>Show day</span>
            <input
              type="date"
              value={selectedDate}
              max={todayISO()}
              onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
            />
          </label>
        </div>

        {loading && <p className="muted">Loading readings…</p>}
        {loadError && (
          <p className="form-error" role="alert">
            {loadError}
          </p>
        )}
        {actionError && (
          <p className="form-error" role="alert">
            {actionError}
          </p>
        )}
        {!loading && !loadError && (
          <ReadingList
            readings={readings}
            editingId={editingId}
            onEdit={startEditing}
            onCancelEdit={() => setEditingId(null)}
            onSave={handleUpdate}
            onDelete={handleDelete}
          />
        )}
      </section>
    </>
  );
}

export default ReadingsPage;
