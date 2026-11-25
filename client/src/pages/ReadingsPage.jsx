import { useState } from 'react';
import { api } from '../api';
import ReadingForm from '../components/ReadingForm';
import { formatDate } from '../utils/dates';
import { slotLabel } from '../utils/readings';

function ReadingsPage() {
  const [lastSaved, setLastSaved] = useState(null);

  async function handleCreate(reading) {
    // hide the previous success message so it doesn't sit next to a new error
    setLastSaved(null);
    const data = await api.createReading(reading);
    setLastSaved(data.reading);
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
    </>
  );
}

export default ReadingsPage;
