import { useState, useEffect } from 'react';
import { fetchItineraries, deleteItinerary } from '../api/client';
import { type Itinerary } from '../types';
import './Itineraries.css';

const Itineraries = () => {
    const [itineraries, setItineraries] = useState<Itinerary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'public' | 'private'>('all');

    useEffect(() => {
        loadItineraries();
    }, []);

    const loadItineraries = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await fetchItineraries(false); // Get all itineraries
            setItineraries(data);
        } catch (err) {
            setError('Failed to load itineraries');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this itinerary?')) {
            return;
        }

        try {
            await deleteItinerary(id);
            await loadItineraries();
        } catch (err) {
            alert('Failed to delete itinerary');
            console.error(err);
        }
    };

    const filteredItineraries = itineraries.filter(itinerary => {
        if (filter === 'public') return itinerary.is_public;
        if (filter === 'private') return !itinerary.is_public;
        return true;
    });

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="itineraries-page">
            <div className="page-header">
                <div>
                    <h1>Itineraries Management</h1>
                    <p className="text-muted">View and manage user itineraries</p>
                </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="card">
                <div className="card-header">
                    <div className="filter-buttons">
                        <button
                            className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                            onClick={() => setFilter('all')}
                        >
                            All ({itineraries.length})
                        </button>
                        <button
                            className={`btn ${filter === 'public' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                            onClick={() => setFilter('public')}
                        >
                            Public ({itineraries.filter(i => i.is_public).length})
                        </button>
                        <button
                            className={`btn ${filter === 'private' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                            onClick={() => setFilter('private')}
                        >
                            Private ({itineraries.filter(i => !i.is_public).length})
                        </button>
                    </div>
                </div>

                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Creator</th>
                                <th>Visibility</th>
                                <th>Attractions</th>
                                <th>Total Price</th>
                                <th>Created</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredItineraries.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center text-muted">
                                        No itineraries found
                                    </td>
                                </tr>
                            ) : (
                                filteredItineraries.map((itinerary) => (
                                    <tr key={itinerary.id}>
                                        <td>
                                            <strong>{itinerary.name}</strong>
                                            {itinerary.description && (
                                                <div className="text-sm text-muted">
                                                    {itinerary.description.substring(0, 60)}...
                                                </div>
                                            )}
                                        </td>
                                        <td>{itinerary.creator_name}</td>
                                        <td>
                                            <span className={`badge ${itinerary.is_public ? 'badge-success' : 'badge-secondary'}`}>
                                                {itinerary.is_public ? '🌐 Public' : '🔒 Private'}
                                            </span>
                                        </td>
                                        <td>{itinerary.attraction_count || 0}</td>
                                        <td>BD {itinerary.total_price?.toFixed(2) || '0.00'}</td>
                                        <td>
                                            <span className="text-sm">
                                                {new Date(itinerary.created_at).toLocaleDateString()}
                                            </span>
                                        </td>
                                        <td>
                                            <button
                                                className="btn btn-danger btn-sm"
                                                onClick={() => handleDelete(itinerary.id)}
                                            >
                                                🗑️
                                            </button>
                                        </td>
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

export default Itineraries;
