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
    // New attraction times (for Scheduled mode)
    const [newAttractionStartTime, setNewAttractionStartTime] = useState<string>('');
    const [newAttractionEndTime, setNewAttractionEndTime] = useState<string>('');
    const [attractionTimes, setAttractionTimes] = useState<Record<string, { start: string; end: string }>>({});

    const toTimeInputValue = (value?: string | null) => {
        if (!value) return '';
        const match = value.match(/(\d{2}):(\d{2})/);
        if (match) {
            return `${match[1]}:${match[2]}`;
        }
        if (value.includes('T')) {
            return value.slice(11, 16);
        }
        return value.slice(0, 5);
    };

    useEffect(() => {
        loadData();
        getUser();
    }, []);

    useEffect(() => {
        if (!editingItinerary?.attractions) {
            setAttractionTimes({});
            return;
        }

        const nextTimes: Record<string, { start: string; end: string }> = {};
        editingItinerary.attractions.forEach((ia) => {
            nextTimes[ia.id] = {
                start: toTimeInputValue(ia.scheduled_start_time),
                end: toTimeInputValue(ia.scheduled_end_time),
            };
        });
        setAttractionTimes(nextTimes);
    }, [editingItinerary?.id, editingItinerary?.attractions]);

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
        setNewAttractionStartTime('');
        setNewAttractionEndTime('');
        setIsModalOpen(true);
    };

    const handleEdit = async (itinerary: Itinerary) => {
        try {
            // Fetch full details (joins) before opening modal
            const fullDetails = await fetchItinerary(itinerary.id);
            setEditingItinerary(fullDetails);
            setSelectedAttractionId(null);
            setNewAttractionStartTime('');
            setNewAttractionEndTime('');
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
            mode: editingItinerary?.mode || (formData.get('mode') as 'flexible' | 'scheduled') || 'flexible',
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
            let startISO, endISO;

            if (editingItinerary.mode === 'scheduled') {
                if (!newAttractionStartTime || !newAttractionEndTime) {
                    alert("Start and End times are required for scheduled itineraries.");
                    return;
                }

                // Validate time range
                const d1 = new Date(`1970-01-01T${newAttractionStartTime}:00Z`).getTime();
                const d2 = new Date(`1970-01-01T${newAttractionEndTime}:00Z`).getTime();

                if (d1 >= d2) {
                    alert("End time must be after start time");
                    return;
                }

                startISO = newAttractionStartTime; // "09:30"
                endISO = newAttractionEndTime;     // "11:00"
            }

            await addItineraryAttraction(
                editingItinerary.id,
                selectedAttractionId,
                startISO,
                endISO
            );

            // Refresh modal data
            const updated = await fetchItinerary(editingItinerary.id);
            setEditingItinerary(updated);

            // Clear selection
            setSelectedAttractionId(null);
            setNewAttractionStartTime('');
            setNewAttractionEndTime('');
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
        // Special validation for time fields
        if (field === 'scheduled_start_time' || field === 'scheduled_end_time') {
            // Only for scheduled mode
            if (editingItinerary?.mode !== 'scheduled') return;

            // Ensure value is safe
            if (!value) return;

            const normalizedValue = toTimeInputValue(value);

            // --- Front-end Validation (Requirement 4) ---
            if (editingItinerary?.attractions) {
                const attraction = editingItinerary.attractions.find(a => a.id === linkId);
                if (attraction) {
                    const otherField = field === 'scheduled_start_time' ? 'scheduled_end_time' : 'scheduled_start_time';
                    const otherValue = attraction[otherField];

                    if (otherValue) {
                        const start = field === 'scheduled_start_time' ? normalizedValue : toTimeInputValue(otherValue as string);
                        const end = field === 'scheduled_end_time' ? normalizedValue : toTimeInputValue(otherValue as string);
                        const toMinutes = (t: string) => {
                            const [h, m] = t.split(':').map(Number);
                            return h * 60 + m;
                        };

                        const d1 = toMinutes(start);
                        const d2 = toMinutes(end);

                        if (d1 >= d2) {
                            alert("End time must be after start time");
                            return;
                        }

                        if (d1 >= d2) {
                            alert("End time must be after start time");

                            return;
                        }
                    }
                }
            }
        }

        try {
            const nextValue = (field === 'scheduled_start_time' || field === 'scheduled_end_time')
                ? toTimeInputValue(value)
                : value;
            await updateItineraryAttraction(linkId, { [field]: nextValue });
            // Refresh modal data to ensure consistency (especially for duration calcs)
            if (editingItinerary?.id) {
                // Optional: debounced refresh if needed, but for safe update we refresh
                const updated = await fetchItinerary(editingItinerary.id);
                setEditingItinerary(updated);
            }
        } catch (err: any) {
            console.error('Failed to update detail', err);
            // Handle DB constraint errors
            if (err?.message?.includes("end time must be after start")) {
                alert("End time must be after start time");
            } else if (err?.message?.includes("Time overlap detected")) {
                alert("Attraction times overlap — adjust schedule");
            } else {
                alert("Failed to update time: " + err.message);
            }
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
                                        {/* Duration Logic: 
                                            If Flexible: use estimated_duration_minutes 
                                            If Scheduled: calculate from attractions text or DB could recompute? 
                                            For now trust estimated_duration_minutes from the DB View if it handles both logic? 
                                            Actually requirement says "Calculate: earliest start -> latest end" 
                                            For List view, we might just rely on checking itinerary.mode 
                                        */}
                                        {itinerary.mode === 'scheduled' ? (
                                            // Ideally backend calculates this, but if we need frontend logic:
                                            // We'll trust estimated_duration_minutes if the backend view updates it correctly for scheduled
                                            // If not, we might settle for just showing what we have
                                            itinerary.estimated_duration_minutes
                                                ? `${Math.floor(itinerary.estimated_duration_minutes / 60)}h ${itinerary.estimated_duration_minutes % 60}m`
                                                : '0m'
                                        ) : (
                                            itinerary.estimated_duration_minutes
                                                ? `${Math.floor(itinerary.estimated_duration_minutes / 60)}h ${itinerary.estimated_duration_minutes % 60}m`
                                                : '-'
                                        )}
                                    </td>
                                    <td className="text-center">
                                        BD {itinerary.total_price?.toFixed(3) || '0.000'}
                                    </td>
                                    <td>
                                        <span className={`badge ${itinerary.is_public ? 'badge-success' : 'badge-warning'}`}>
                                            {itinerary.is_public ? 'Public' : 'Private'}
                                        </span>
                                        <span className={`badge ml-1 ${itinerary.mode === 'scheduled' ? 'badge-info' : 'badge-secondary'}`}>
                                            {itinerary.mode === 'scheduled' ? 'Scheduled' : 'Flexible'}
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
                className="modal-wide"
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

                    {/* Mode Selection */}
                    <div className="form-group">
                        <label className="form-label required">Itinerary Type</label>
                        {editingItinerary?.attractions && editingItinerary.attractions.length > 0 ? (
                            <div className="p-2 bg-gray-100 rounded text-sm text-gray-600">
                                Mode cannot be changed after attractions are added.
                                Current: <strong>{editingItinerary.mode === 'scheduled' ? 'Scheduled' : 'Flexible'}</strong>
                            </div>
                        ) : (
                            <div className="flex gap-4 mt-1">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="mode"
                                        value="flexible"
                                        defaultChecked={!editingItinerary?.mode || editingItinerary.mode === 'flexible'}
                                    />
                                    <span>Flexible (Default)</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="mode"
                                        value="scheduled"
                                        defaultChecked={editingItinerary?.mode === 'scheduled'}
                                    />
                                    <span>Scheduled (Timed)</span>
                                </label>
                            </div>
                        )}
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

                                {editingItinerary.mode === 'scheduled' && (
                                    <>
                                        <div className="flex flex-col">
                                            <label className="text-xs text-muted mb-1">Start</label>
                                            <input
                                                type="time"
                                                className="input input-sm"
                                                value={newAttractionStartTime}
                                                onChange={(e) => setNewAttractionStartTime(e.target.value)}
                                            />
                                        </div>
                                        <div className="flex flex-col">
                                            <label className="text-xs text-muted mb-1">End</label>
                                            <input
                                                type="time"
                                                className="input input-sm"
                                                value={newAttractionEndTime}
                                                onChange={(e) => setNewAttractionEndTime(e.target.value)}
                                            />
                                        </div>
                                    </>
                                )}

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
                                            {editingItinerary.mode === 'scheduled' && (
                                                <>
                                                    <th style={{ width: '130px' }}>Start</th>
                                                    <th style={{ width: '130px' }}>End</th>
                                                </>
                                            )}
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
                                                    {editingItinerary.mode === 'scheduled' && (
                                                        <>
                                                            <td>
                                                                <input
                                                                    type="time"
                                                                    className="input input-sm"
                                                                    // Extract HH:mm from ISO string
                                                                    value={attractionTimes[ia.id]?.start || ''}
                                                                    onChange={(e) =>
                                                                        setAttractionTimes((prev) => ({
                                                                            ...prev,
                                                                            [ia.id]: {
                                                                                start: e.target.value,
                                                                                end: prev[ia.id]?.end || '',
                                                                            },
                                                                        }))
                                                                    }
                                                                    onBlur={(e) => handleUpdateAttractionDetail(ia.id, 'scheduled_start_time', e.target.value)}
                                                                />
                                                            </td>
                                                            <td>
                                                                <input
                                                                    type="time"
                                                                    className="input input-sm"
                                                                    value={attractionTimes[ia.id]?.end || ''}
                                                                    onChange={(e) =>
                                                                        setAttractionTimes((prev) => ({
                                                                            ...prev,
                                                                            [ia.id]: {
                                                                                start: prev[ia.id]?.start || '',
                                                                                end: e.target.value,
                                                                            },
                                                                        }))
                                                                    }
                                                                    onBlur={(e) => handleUpdateAttractionDetail(ia.id, 'scheduled_end_time', e.target.value)}
                                                                />
                                                            </td>
                                                        </>
                                                    )}
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

                            {/* Duration Summary for Scheduled */}
                            {editingItinerary.mode === 'scheduled' && (
                                <div className="mt-4 p-2 bg-blue-50 text-sm">
                                    <strong>Scheduled Duration: </strong>
                                    {editingItinerary.estimated_duration_minutes
                                        ? `${Math.floor(editingItinerary.estimated_duration_minutes / 60)}h ${editingItinerary.estimated_duration_minutes % 60}m`
                                        : '0h 0m'
                                    }
                                    <span className="text-gray-500 ml-2">(Auto-calculated from Start/End times)</span>
                                </div>
                            )}

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
