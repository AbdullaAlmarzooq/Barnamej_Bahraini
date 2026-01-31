import { supabase } from '../api/client';
import { useState, useEffect } from 'react';
import {
    fetchItineraries,
    deleteItinerary,
    createItinerary,
    updateItinerary,
    fetchItinerary,
    addItineraryAttraction,
    removeItineraryAttraction,
    updateItineraryAttraction
} from '../api/itineraries';
import { fetchAttractions } from '../api/client';
import { type Itinerary, type Attraction, type ItineraryAttraction } from '../types';
import Modal from '../components/Common/Modal';
import './Itineraries.css';
interface UserProfile {
    id: string;
    email: string;
    name: string;
}

const Itineraries = () => {
    const [itineraries, setItineraries] = useState<Itinerary[]>([]);
    const [allAttractions, setAllAttractions] = useState<Attraction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'public' | 'private'>('all');
    const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItinerary, setEditingItinerary] = useState<Itinerary | null>(null);
    const [itineraryToDelete, setItineraryToDelete] = useState<string | null>(null);

    // Attraction selection state inside Modal
    const [selectedAttractionId, setSelectedAttractionId] = useState<string | null>(null);

    useEffect(() => {
        loadData();
        getUser();
    }, []);

    const getUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            // Fetch the user's profile from profiles table
            const { data: profile } = await supabase
                .from('profiles')
                .select('id, email, full_name')
                .eq('id', user.id)
                .single();

            if (profile) {
                setCurrentUser({
                    id: profile.id,
                    email: profile.email || '',
                    name: profile.full_name || profile.email || 'User'
                });
            } else {
                // Fallback if profile doesn't exist
                setCurrentUser({
                    id: user.id,
                    email: user.email || '',
                    name: user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'User'
                });
            }
        }
    };

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);
            const [itinerariesData, attractionsData] = await Promise.all([
                fetchItineraries('all'),
                fetchAttractions()
            ]);
            setItineraries(itinerariesData || []);
            setAllAttractions(attractionsData || []);
        } catch (err) {
            setError('Failed to load data');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const loadItineraries = async () => {
        try {
            const data = await fetchItineraries('all');
            setItineraries(data || []);
        } catch (err) {
            console.error("Error refreshing itineraries", err);
        }
    };

    const handleDelete = (id: string) => {
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
            // Fetch full details (joins) before opening modal
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
            // Only send user_id if we are creating new, updates usually don't change owner
            ...(editingItinerary ? {} : { user_id: currentUser?.id }),
            is_public: formData.get('is_public') === 'on', // Checkbox logic
        };

        try {
            if (editingItinerary && editingItinerary.id) {
                // Update
                await updateItinerary(editingItinerary.id, itineraryData);
                // Refresh the specific itinerary in the modal to show changes
                const updated = await fetchItinerary(editingItinerary.id);
                setEditingItinerary(updated);

                alert("Itinerary updated successfully!");
                await loadItineraries();
                // We keep modal open or close it? usually close on save
                // setIsModalOpen(false); 
            } else {
                // Create - pass the creator's name from currentUser
                const response = await createItinerary(
                    itineraryData,
                    currentUser?.id || '',
                    currentUser?.name // Pass the user's full name
                );

                if (response && response.id) {
                    // Fetch full object to switch modal to "Edit Mode" so they can add attractions
                    const newItinerary = await fetchItinerary(response.id);
                    setEditingItinerary(newItinerary);
                    await loadItineraries();
                    alert("Itinerary created! You can now add attractions below.");
                }
            }
        } catch (err) {
            alert('Failed to save itinerary');
            console.error(err);
        }
    };

    // --- Manage Attractions Logic ---

    const handleAddAttraction = async () => {
        if (!editingItinerary || !editingItinerary.id || !selectedAttractionId) return;

        try {
            await addItineraryAttraction(editingItinerary.id, selectedAttractionId);

            // Refresh modal data
            const updated = await fetchItinerary(editingItinerary.id);
            setEditingItinerary(updated);

            // Clear selection
            setSelectedAttractionId(null);
        } catch (err) {
            alert('Failed to add attraction');
            console.error(err);
        }
    };

    const handleRemoveAttraction = async (attractionId: string) => {
        if (!editingItinerary || !editingItinerary.id) return;

        if (!window.confirm("Remove this attraction from itinerary?")) {
            return;
        }

        try {
            await removeItineraryAttraction(editingItinerary.id, attractionId);
            const updated = await fetchItinerary(editingItinerary.id);
            setEditingItinerary(updated);
        } catch (err) {
            alert('Failed to remove attraction');
            console.error(err);
        }
    };

    const handleUpdateAttractionDetail = async (linkId: string, field: string, value: any) => {
        try {
            await updateItineraryAttraction(linkId, { [field]: value });
            // Optionally refresh to show updated totals, or just let user continue
        } catch (err) {
            console.error('Failed to update detail', err);
        }
    };

    // --- Rendering logic ---
    const filteredItineraries = itineraries.filter(itin => {
        if (filter === 'public') return itin.is_public;
        if (filter === 'private') return !itin.is_public;
        return true; // all
    });

    if (loading) return <div className="loading">Loading itineraries...</div>;
    if (error) return <div className="error">{error}</div>;

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>Itineraries</h1>
                <div className="page-actions">
                    <div className="filter-group">
                        <label>Filter:</label>
                        <select
                            className="select"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value as typeof filter)}
                        >
                            <option value="all">All</option>
                            <option value="public">Public</option>
                            <option value="private">Private</option>
                        </select>
                    </div>
                    <button className="btn btn-primary" onClick={handleAdd}>
                        + New Itinerary
                    </button>
                </div>
            </div>

            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Creator</th>
                            <th>Attractions</th>
                            <th>Duration</th>
                            <th>Total Price</th>
                            <th>Status</th>
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
                                        <div className="font-bold">{itinerary.name}</div>
                                        {itinerary.description && (
                                            <div className="text-xs text-muted">
                                                {itinerary.description.substring(0, 60)}
                                                {itinerary.description.length > 60 && '...'}
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        {/* Use creator.full_name from profiles join, fallback to creator_name field, then 'Unknown' */}
                                        {itinerary.creator?.full_name || itinerary.creator_name || 'Unknown User'}
                                    </td>
                                    <td className="text-center">
                                        {itinerary.total_attractions || 0}
                                    </td>
                                    <td className="text-center">
                                        {itinerary.estimated_duration_minutes
                                            ? `${Math.floor(itinerary.estimated_duration_minutes / 60)}h ${itinerary.estimated_duration_minutes % 60}m`
                                            : '-'}
                                    </td>
                                    <td className="text-center">
                                        BD {itinerary.total_price?.toFixed(3) || '0.000'}
                                    </td>
                                    <td>
                                        <span className={`badge ${itinerary.is_public ? 'badge-success' : 'badge-warning'}`}>
                                            {itinerary.is_public ? 'Public' : 'Private'}
                                        </span>
                                        {itinerary.is_featured && (
                                            <span className="badge badge-info ml-1">Featured</span>
                                        )}
                                    </td>
                                    <td>
                                        <div className="btn-group">
                                            <button
                                                className="btn btn-sm btn-secondary"
                                                onClick={() => handleEdit(itinerary)}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                className="btn btn-sm btn-danger"
                                                onClick={() => handleDelete(itinerary.id)}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Create/Edit Itinerary Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingItinerary ? 'Edit Itinerary' : 'Create New Itinerary'}
                closeOnOverlayClick={false}
                footer={
                    <button type="submit" form="itinerary-form" className="btn btn-primary">
                        {editingItinerary ? 'Save Changes' : 'Create Itinerary'}
                    </button>
                }
            >
                <form id="itinerary-form" onSubmit={handleSubmit} className="form">
                    <div className="form-group">
                        <label className="form-label required">Name</label>
                        <input
                            type="text"
                            name="name"
                            className="input"
                            required
                            defaultValue={editingItinerary?.name || ''}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Description</label>
                        <textarea
                            name="description"
                            className="textarea"
                            rows={3}
                            defaultValue={editingItinerary?.description || ''}
                        />
                    </div>

                    {/* Creator Name (read-only) */}
                    <div className="form-group">
                        <label className="form-label">Creator</label>
                        <input
                            type="text"
                            className="input"
                            value={
                                // Priority: creator.full_name from join > creator_name from DB > current user name
                                editingItinerary?.creator?.full_name ||
                                editingItinerary?.creator_name ||
                                currentUser?.name ||
                                ''
                            }
                            readOnly
                            disabled
                        />
                    </div>

                    {/* Public Toggle */}
                    <div className="form-group">
                        <div className="flex items-center justify-between" style={{ maxWidth: '300px' }}>
                            <div>
                                <label className="label mb-0">Make Public</label>
                                <p className="text-sm text-muted mt-0">
                                    Visible to all users
                                </p>
                            </div>
                            <label className="switch">
                                <input
                                    type="checkbox"
                                    name="is_public"
                                    defaultChecked={editingItinerary?.is_public}
                                />
                                <span className="slider round"></span>
                            </label>
                        </div>
                    </div>

                    {/* Manage Attractions - Only when editing existing itinerary */}
                    {editingItinerary && editingItinerary.id && (
                        <>
                            <hr style={{ margin: '24px 0', border: '1px solid #eee' }} />
                            <h3 className="mb-2 font-bold">Manage Attractions</h3>

                            <div className="flex gap-sm mb-4">
                                <select
                                    className="select"
                                    value={selectedAttractionId || ''}
                                    onChange={(e) => setSelectedAttractionId(e.target.value)}
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
                                            <th style={{ width: '110px' }}>Start</th>
                                            <th style={{ width: '110px' }}>End</th>
                                            <th style={{ width: '80px' }}>Price</th>
                                            <th>Notes</th>
                                            <th style={{ width: '50px' }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(!editingItinerary.attractions || editingItinerary.attractions.length === 0) ? (
                                            <tr>
                                                <td colSpan={6} className="text-center text-muted">No attractions added yet.</td>
                                            </tr>
                                        ) : (
                                            editingItinerary.attractions.map((ia: ItineraryAttraction) => (
                                                <tr key={ia.id}>
                                                    <td>
                                                        <div className="font-bold">{ia.attraction?.name || 'Unknown Attraction'}</div>
                                                        <div className="text-xs text-muted">{ia.attraction?.category}</div>
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="time"
                                                            className="input input-sm"
                                                            defaultValue={ia.scheduled_start_time || ''}
                                                            onBlur={(e) => handleUpdateAttractionDetail(ia.id, 'scheduled_start_time', e.target.value)}
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="time"
                                                            className="input input-sm"
                                                            defaultValue={ia.scheduled_end_time || ''}
                                                            onBlur={(e) => handleUpdateAttractionDetail(ia.id, 'scheduled_end_time', e.target.value)}
                                                        />
                                                    </td>
                                                    <td>
                                                        <div className="py-2 text-sm text-center">
                                                            {ia.attraction?.price ? `BD ${ia.attraction.price.toFixed(3)}` : 'Free'}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="text"
                                                            className="input input-sm"
                                                            defaultValue={ia.notes || ''}
                                                            placeholder="Notes..."
                                                            onBlur={(e) => handleUpdateAttractionDetail(ia.id, 'notes', e.target.value)}
                                                        />
                                                    </td>
                                                    <td>
                                                        <button
                                                            type="button"
                                                            className="btn btn-danger btn-sm"
                                                            // Pass attraction_id here assuming API needs the FK, 
                                                            // if API needs link ID, switch to ia.id
                                                            onClick={() => handleRemoveAttraction(ia.attraction_id)}
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
                                Total Price: BD {
                                    (editingItinerary.attractions || [])
                                        .reduce((sum, item) => sum + (item.attraction?.price || 0), 0)
                                        .toFixed(3)
                                }
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