import { useState, useEffect } from 'react';
import { fetchItineraries, deleteItinerary, createItinerary, updateItinerary, fetchItinerary, fetchAttractions, addItineraryAttraction, removeItineraryAttraction, updateItineraryAttraction } from '../api/client';
import { type Itinerary, type Attraction } from '../types';
import Modal from '../components/Common/Modal';
import './Itineraries.css';

const Itineraries = () => {
    const [itineraries, setItineraries] = useState<Itinerary[]>([]);
    const [allAttractions, setAllAttractions] = useState<Attraction[]>([]); // For dropdown
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'public' | 'private'>('all');

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItinerary, setEditingItinerary] = useState<Itinerary | null>(null);
    const [itineraryToDelete, setItineraryToDelete] = useState<number | null>(null);

    // Attraction selection state
    const [selectedAttractionId, setSelectedAttractionId] = useState<number | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);
            const [itinerariesData, attractionsData] = await Promise.all([
                fetchItineraries('all'),
                fetchAttractions()
            ]);
            setItineraries(itinerariesData);
            setAllAttractions(attractionsData);
        } catch (err) {
            setError('Failed to load data');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const loadItineraries = async () => {
        const data = await fetchItineraries('all');
        setItineraries(data);
    };

    const handleDelete = (id: number) => {
        setItineraryToDelete(id);
    };

    const confirmDelete = async () => {
        if (!itineraryToDelete) return;

        try {
            await deleteItinerary(itineraryToDelete);
            await loadItineraries();
            setItineraryToDelete(null);
        } catch (err) {
            alert('Failed to delete itinerary');
            console.error(err);
        }
    };

    const handleAdd = () => {
        setEditingItinerary(null);
        setSelectedAttractionId(null);
        setIsModalOpen(true);
    };

    const handleEdit = async (itinerary: Itinerary) => {
        try {
            // Fetch full details including attractions
            const fullDetails = await fetchItinerary(itinerary.id);
            setEditingItinerary(fullDetails);
            setSelectedAttractionId(null);
            setIsModalOpen(true);
        } catch (err) {
            alert('Failed to load itinerary details');
            console.error(err);
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        const itineraryData = {
            name: formData.get('name') as string,
            description: formData.get('description') as string,
            creator_name: formData.get('creator_name') as string,
            is_public: formData.get('is_public') === 'on'
        };

        try {
            if (editingItinerary && editingItinerary.id) {
                await updateItinerary(editingItinerary.id, itineraryData);
                setIsModalOpen(false);
                await loadItineraries();
            } else {
                const response = await createItinerary(itineraryData);
                const newItinerary = await fetchItinerary(response.id);
                setEditingItinerary(newItinerary);
                // Keep modal open for adding attractions
                await loadItineraries();
            }
        } catch (err) {
            alert('Failed to save itinerary');
            console.error(err);
        }
    };

    // manage attractions logic
    const handleAddAttraction = async () => {
        if (!editingItinerary || !selectedAttractionId) return;

        try {
            await addItineraryAttraction(editingItinerary.id, selectedAttractionId);
            const updated = await fetchItinerary(editingItinerary.id);
            setEditingItinerary(updated);
            setSelectedAttractionId(null);
            await loadItineraries(); // Update main list counts/prices
        } catch (err) {
            alert('Failed to add attraction');
            console.error(err);
        }
    };

    const handleRemoveAttraction = async (attractionId: number) => {
        if (!editingItinerary) return;
        if (!confirm('Remove this attraction from the itinerary?')) return;

        try {
            await removeItineraryAttraction(editingItinerary.id, attractionId);
            const updated = await fetchItinerary(editingItinerary.id);
            setEditingItinerary(updated);
            await loadItineraries();
        } catch (err) {
            alert('Failed to remove attraction');
            console.error(err);
        }
    };

    const handleUpdateAttractionDetail = async (linkId: number, field: string, value: string | number) => {
        try {
            await updateItineraryAttraction(linkId, { [field]: value });
            // Ideally we'd refresh, but to avoid losing focus we might just rely on the API success
            // or silent refresh. For now, let's just log success.
            console.log('Updated', field, value);
        } catch (err) {
            console.error('Failed to update detail', err);
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
                <button className="btn btn-primary" onClick={handleAdd}>
                    ➕ Add Itinerary
                </button>
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
                                            <div className="flex gap-sm">
                                                <button
                                                    className="btn btn-secondary btn-sm"
                                                    onClick={() => handleEdit(itinerary)}
                                                >
                                                    ✏️
                                                </button>
                                                <button
                                                    className="btn btn-danger btn-sm"
                                                    onClick={() => handleDelete(itinerary.id)}
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit/Create Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    loadItineraries(); // Refresh on close to ensure strict consistency
                }}
                title={editingItinerary ? 'Edit Itinerary' : 'Create Itinerary'}
                className="modal-wide"
                footer={
                    <>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setIsModalOpen(false)}
                        >
                            Close
                        </button>
                        <button
                            type="submit"
                            form="itinerary-form"
                            className="btn btn-primary"
                        >
                            {editingItinerary ? 'Save Changes' : 'Create Itinerary'}
                        </button>
                    </>
                }
            >
                <form id="itinerary-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="label">Name</label>
                        <input
                            type="text"
                            name="name"
                            className="input"
                            placeholder="e.g., Weekend in Manama"
                            defaultValue={editingItinerary?.name}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="label">Description</label>
                        <textarea
                            name="description"
                            className="textarea"
                            placeholder="Brief description of the trip..."
                            defaultValue={editingItinerary?.description}
                        />
                    </div>

                    <div className="form-group">
                        <label className="label">Creator Name</label>
                        <input
                            type="text"
                            name="creator_name"
                            className="input"
                            placeholder="e.g., John Doe"
                            defaultValue={editingItinerary?.creator_name || 'Admin'}
                        />
                    </div>

                    <div className="form-group">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                name="is_public"
                                defaultChecked={editingItinerary?.is_public}
                            />
                            Make Public
                        </label>
                    </div>

                    {/* Manage Attractions Section - Only when editing */}
                    {editingItinerary && editingItinerary.id && (
                        <>
                            <hr style={{ margin: '24px 0', border: '1px solid #eee' }} />
                            <h3 className="mb-2 font-bold">Manage Attractions</h3>

                            <div className="flex gap-sm mb-4">
                                <select
                                    className="select"
                                    value={selectedAttractionId || ''}
                                    onChange={(e) => setSelectedAttractionId(Number(e.target.value))}
                                >
                                    <option value="">Select attraction to add...</option>
                                    {allAttractions.map(attr => (
                                        <option key={attr.id} value={attr.id}>
                                            {attr.name} ({attr.location})
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    disabled={!selectedAttractionId}
                                    onClick={handleAddAttraction}
                                >
                                    Add
                                </button>
                            </div>

                            <div className="table-container" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Attraction</th>
                                            <th style={{ width: '100px' }}>Start</th>
                                            <th style={{ width: '100px' }}>End</th>
                                            <th style={{ width: '80px' }}>Price</th>
                                            <th style={{ width: '120px' }}>Notes</th>
                                            <th style={{ width: '50px' }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(!editingItinerary.attractions || editingItinerary.attractions.length === 0) ? (
                                            <tr>
                                                <td colSpan={6} className="text-center text-muted">No attractions added yet.</td>
                                            </tr>
                                        ) : (
                                            editingItinerary.attractions.map(ia => (
                                                <tr key={ia.link_id}>
                                                    <td>
                                                        <div className="font-bold">{ia.name}</div>
                                                        <div className="text-xs text-muted">{ia.category}</div>
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="time"
                                                            className="input input-sm"
                                                            defaultValue={ia.start_time || ''}
                                                            onBlur={(e) => handleUpdateAttractionDetail(ia.link_id, 'start_time', e.target.value)}
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="time"
                                                            className="input input-sm"
                                                            defaultValue={ia.end_time || ''}
                                                            onBlur={(e) => handleUpdateAttractionDetail(ia.link_id, 'end_time', e.target.value)}
                                                        />
                                                    </td>
                                                    <td>
                                                        <div className="py-2 text-sm text-center">
                                                            {ia.price ? `BD ${ia.price.toFixed(3)}` : 'Free'}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="text"
                                                            className="input input-sm"
                                                            defaultValue={ia.notes || ''}
                                                            placeholder="Notes..."
                                                            onBlur={(e) => handleUpdateAttractionDetail(ia.link_id, 'notes', e.target.value)}
                                                        />
                                                    </td>
                                                    <td>
                                                        <button
                                                            type="button"
                                                            className="btn btn-danger btn-sm"
                                                            onClick={() => handleRemoveAttraction(ia.id)}
                                                            title="Remove attraction"
                                                        >
                                                            ✕
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-2 text-right font-bold">
                                Total Price: BD {editingItinerary.attractions?.reduce((sum, item) => sum + (item.price || 0), 0).toFixed(2) || '0.00'}
                            </div>
                        </>
                    )}
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={!!itineraryToDelete}
                onClose={() => setItineraryToDelete(null)}
                title="Delete Itinerary"
                footer={
                    <>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setItineraryToDelete(null)}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="btn btn-danger"
                            onClick={confirmDelete}
                        >
                            Delete
                        </button>
                    </>
                }
            >
                <div className="p-4">
                    <p>Are you sure you want to delete this itinerary?</p>
                    <p className="text-sm text-muted mt-2">This action cannot be undone.</p>
                </div>
            </Modal>
        </div>
    );
};

export default Itineraries;
