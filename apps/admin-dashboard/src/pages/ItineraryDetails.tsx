import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchItinerary } from '../api/itineraries';
import { type Itinerary, type ItineraryAttraction } from '../types';
import './ItineraryDetails.css';

const ItineraryDetails = () => {
    const { id } = useParams<{ id: string }>();
    const [itinerary, setItinerary] = useState<Itinerary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;
        loadItinerary(id);
    }, [id]);

    const loadItinerary = async (itineraryId: string) => {
        try {
            setLoading(true);
            setError(null);
            const data = await fetchItinerary(itineraryId);
            setItinerary(data);
        } catch (err) {
            setError('Failed to load itinerary details');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
            </div>
        );
    }

    if (error || !itinerary) {
        return (
            <div className="error-message">
                {error || 'Itinerary not found'}
            </div>
        );
    }

    const formatDate = (value?: string | null) => {
        if (!value) return '—';
        const date = new Date(value);
        return date.toLocaleDateString();
    };

    const formatTime = (value?: string | null) => {
        if (!value) return '—';
        if (value.includes('T')) {
            const date = new Date(value);
            if (!Number.isNaN(date.getTime())) {
                return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
        }
        const match = value.match(/(\d{2}):(\d{2})/);
        if (match) {
            return `${match[1]}:${match[2]}`;
        }
        return value;
    };

    return (
        <div className="itinerary-details-page">
            <div className="page-header">
                <div>
                    <h1>Itinerary Details</h1>
                    <p className="text-muted">View itinerary information and scheduled attractions</p>
                </div>
                <Link to="/admin/itineraries" className="btn btn-secondary">
                    ← Back to Itineraries
                </Link>
            </div>

            <div className="card details-card">
                <div className="card-header">
                    <h2 className="card-title">{itinerary.name}</h2>
                </div>
                <div className="details-grid">
                    <div className="form-group">
                        <label className="label">Name</label>
                        <input className="input" value={itinerary.name} disabled />
                    </div>
                    <div className="form-group">
                        <label className="label">Creator</label>
                        <input
                            className="input"
                            value={itinerary.creator?.full_name || itinerary.creator_name || 'Unknown'}
                            disabled
                        />
                    </div>
                    <div className="form-group full-width">
                        <label className="label">Description</label>
                        <textarea className="textarea" value={itinerary.description || ''} disabled />
                    </div>
                    <div className="form-group">
                        <label className="label">Visibility</label>
                        <input className="input" value={itinerary.is_public ? 'Public' : 'Private'} disabled />
                    </div>
                    <div className="form-group">
                        <label className="label">Mode</label>
                        <input className="input" value={itinerary.mode === 'scheduled' ? 'Scheduled' : 'Flexible'} disabled />
                    </div>
                    <div className="form-group">
                        <label className="label">Total Attractions</label>
                        <input className="input" value={itinerary.total_attractions || 0} disabled />
                    </div>
                    <div className="form-group">
                        <label className="label">Total Price (BHD)</label>
                        <input className="input" value={(itinerary.total_price || 0).toFixed(3)} disabled />
                    </div>
                    <div className="form-group">
                        <label className="label">Estimated Duration (min)</label>
                        <input className="input" value={itinerary.estimated_duration_minutes || 0} disabled />
                    </div>
                    <div className="form-group">
                        <label className="label">Start Date</label>
                        <input className="input" value={formatDate(itinerary.start_date)} disabled />
                    </div>
                    <div className="form-group">
                        <label className="label">End Date</label>
                        <input className="input" value={formatDate(itinerary.end_date)} disabled />
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">Attractions ({itinerary.attractions?.length || 0})</h2>
                </div>
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Category</th>
                                <th>Position</th>
                                <th>Custom Price</th>
                                <th>Start Time</th>
                                <th>End Time</th>
                                <th>Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(!itinerary.attractions || itinerary.attractions.length === 0) ? (
                                <tr>
                                    <td colSpan={7} className="text-center text-muted">
                                        No attractions added yet.
                                    </td>
                                </tr>
                            ) : (
                                itinerary.attractions.map((ia: ItineraryAttraction) => (
                                    <tr key={ia.id}>
                                        <td>{ia.attraction?.name || 'Attraction'}</td>
                                        <td>
                                            {ia.attraction?.category ? (
                                                <span className="badge badge-secondary">{ia.attraction.category}</span>
                                            ) : '—'}
                                        </td>
                                        <td className="text-center">{ia.position + 1}</td>
                                        <td className="text-center">
                                            {ia.custom_price != null ? `BD ${ia.custom_price.toFixed(3)}` : '—'}
                                        </td>
                                        <td>{formatTime(ia.scheduled_start_time)}</td>
                                        <td>{formatTime(ia.scheduled_end_time)}</td>
                                        <td>{ia.notes || '—'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ItineraryDetails;
