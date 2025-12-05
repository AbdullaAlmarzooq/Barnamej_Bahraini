import { useState, useEffect } from 'react';
import {
    fetchAttractions,
    deleteAttraction,
    createAttraction,
    updateAttraction,
    fetchAttractionPhotos,
    addAttractionPhoto,
    deleteAttractionPhoto,
    setPrimaryPhoto
} from '../api/client';
import { type Attraction, type AttractionPhoto } from '../types';
import Modal from '../components/Common/Modal';
import './Attractions.css';

const Attractions = () => {
    const [attractions, setAttractions] = useState<Attraction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAttraction, setEditingAttraction] = useState<Attraction | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Photo management state
    const [photos, setPhotos] = useState<AttractionPhoto[]>([]);
    const [loadingPhotos, setLoadingPhotos] = useState(false);
    const [newPhotoUrl, setNewPhotoUrl] = useState('');

    useEffect(() => {
        loadAttractions();
    }, []);

    const loadAttractions = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await fetchAttractions();
            setAttractions(data);
        } catch (err) {
            setError('Failed to load attractions');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this attraction?')) {
            return;
        }

        try {
            await deleteAttraction(id);
            await loadAttractions();
        } catch (err) {
            alert('Failed to delete attraction');
            console.error(err);
        }
    };

    const loadPhotos = async (attractionId: number) => {
        try {
            setLoadingPhotos(true);
            const attractionPhotos = await fetchAttractionPhotos(attractionId);
            setPhotos(attractionPhotos);
        } catch (err) {
            console.error('Failed to load photos:', err);
        } finally {
            setLoadingPhotos(false);
        }
    };

    const handleAddPhoto = async () => {
        if (!editingAttraction || !newPhotoUrl.trim()) {
            return;
        }

        try {
            await addAttractionPhoto(editingAttraction.id, newPhotoUrl);
            setNewPhotoUrl('');
            await loadPhotos(editingAttraction.id);
            await loadAttractions(); // Refresh to update primary image if needed
        } catch (err) {
            alert('Failed to add photo');
            console.error(err);
        }
    };

    const handleDeletePhoto = async (photoId: number) => {
        if (!editingAttraction) return;

        if (!confirm('Are you sure you want to delete this photo?')) {
            return;
        }

        try {
            await deleteAttractionPhoto(photoId);
            await loadPhotos(editingAttraction.id);
            await loadAttractions(); // Refresh to update table view
        } catch (err) {
            alert('Failed to delete photo. Make sure it\'s not the last photo.');
            console.error(err);
        }
    };

    const handleSetPrimary = async (photoId: number) => {
        if (!editingAttraction) return;

        try {
            await setPrimaryPhoto(photoId);
            await loadPhotos(editingAttraction.id);
            await loadAttractions(); // Refresh to update table view
        } catch (err) {
            alert('Failed to set primary photo');
            console.error(err);
        }
    };

    const handleEdit = async (attraction: Attraction) => {
        setEditingAttraction(attraction);
        setIsModalOpen(true);
        // Load photos for this attraction
        await loadPhotos(attraction.id);
    };

    const handleAdd = () => {
        setEditingAttraction(null);
        setPhotos([]);
        setNewPhotoUrl('');
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        const attractionData = {
            name: formData.get('name') as string,
            description: formData.get('description') as string,
            category: formData.get('category') as string,
            location: formData.get('location') as string,
            image: formData.get('image') as string,
            rating: parseFloat(formData.get('rating') as string) || 0,
            price: parseFloat(formData.get('price') as string) || 0,
        };

        try {
            if (editingAttraction) {
                await updateAttraction(editingAttraction.id, attractionData);
            } else {
                await createAttraction(attractionData);
            }
            setIsModalOpen(false);
            await loadAttractions();
        } catch (err) {
            alert('Failed to save attraction');
            console.error(err);
        }
    };

    const filteredAttractions = attractions.filter(attraction =>
        attraction.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        attraction.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        attraction.location.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="attractions-page">
            <div className="page-header">
                <div>
                    <h1>Attractions Management</h1>
                    <p className="text-muted">Manage all tourist attractions in Bahrain</p>
                </div>
                <button className="btn btn-primary" onClick={handleAdd}>
                    ➕ Add Attraction
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="card">
                <div className="card-header">
                    <input
                        type="text"
                        className="input"
                        placeholder="🔍 Search attractions..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ maxWidth: '400px' }}
                    />
                </div>

                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Image</th>
                                <th>Name</th>
                                <th>Category</th>
                                <th>Location</th>
                                <th>Rating</th>
                                <th>Price</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAttractions.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center text-muted">
                                        No attractions found
                                    </td>
                                </tr>
                            ) : (
                                filteredAttractions.map((attraction) => (
                                    <tr key={attraction.id}>
                                        <td>
                                            <img
                                                src={attraction.image || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Crect fill='%23ddd' width='80' height='80'/%3E%3Ctext fill='%23999' x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle' font-family='Arial' font-size='10'%3ENo Image%3C/text%3E%3C/svg%3E"}
                                                alt={attraction.name}
                                                className="attraction-thumbnail"
                                                onError={(e) => {
                                                    e.currentTarget.onerror = null; // Prevent infinite loop
                                                    e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Crect fill='%23ddd' width='80' height='80'/%3E%3Ctext fill='%23999' x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle' font-family='Arial' font-size='10'%3ENo Image%3C/text%3E%3C/svg%3E";
                                                }}
                                            />
                                        </td>
                                        <td>
                                            <strong>{attraction.name}</strong>
                                            <div className="text-sm text-muted">
                                                {attraction.description.substring(0, 60)}...
                                            </div>
                                        </td>
                                        <td>
                                            <span className="badge badge-primary">{attraction.category}</span>
                                        </td>
                                        <td>{attraction.location}</td>
                                        <td>⭐ {attraction.rating.toFixed(1)}</td>
                                        <td>BD {attraction.price?.toFixed(2) || '0.00'}</td>
                                        <td>
                                            <div className="flex gap-sm">
                                                <button
                                                    className="btn btn-secondary btn-sm"
                                                    onClick={() => handleEdit(attraction)}
                                                >
                                                    ✏️
                                                </button>
                                                <button
                                                    className="btn btn-danger btn-sm"
                                                    onClick={() => handleDelete(attraction.id)}
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

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingAttraction ? 'Edit Attraction' : 'Add New Attraction'}
                footer={
                    <>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setIsModalOpen(false)}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            form="attraction-form"
                            className="btn btn-primary"
                        >
                            {editingAttraction ? 'Update' : 'Create'}
                        </button>
                    </>
                }
            >
                <form id="attraction-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="label">Name</label>
                        <input
                            type="text"
                            name="name"
                            className="input"
                            placeholder="e.g., Bahrain National Museum"
                            defaultValue={editingAttraction?.name}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="label">Description</label>
                        <textarea
                            name="description"
                            className="textarea"
                            placeholder="Brief description of the attraction and what makes it special..."
                            defaultValue={editingAttraction?.description}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="label">Category</label>
                        <select
                            name="category"
                            className="select"
                            defaultValue={editingAttraction?.category}
                            required
                        >
                            <option value="">Select a category</option>
                            <option value="Historical">Historical</option>
                            <option value="Landmark">Landmark</option>
                            <option value="Nature">Nature</option>
                            <option value="Religious">Religious</option>
                            <option value="Museum">Museum</option>
                            <option value="Shopping">Shopping</option>
                            <option value="Entertainment">Entertainment</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="label">Location</label>
                        <input
                            type="text"
                            name="location"
                            className="input"
                            placeholder="e.g., Manama, Muharraq, Riffa"
                            defaultValue={editingAttraction?.location}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="label">Main Image URL</label>
                        <input
                            type="text"
                            name="image"
                            className="input"
                            placeholder="http://192.168.100.38:3000/public/images/attractions/1/photo.jpg"
                            defaultValue={editingAttraction?.image}
                            required
                        />
                        <small className="text-muted">
                            Photos stored in server/public/images/attractions/{'{id}'}/ folder
                        </small>
                    </div>

                    <div className="form-group">
                        <label className="label">Initial Rating (0-5)</label>
                        <input
                            type="number"
                            name="rating"
                            className="input"
                            placeholder="e.g., 4.5"
                            min="0"
                            max="5"
                            step="0.1"
                            defaultValue={editingAttraction?.rating || 0}
                        />
                    </div>

                    <div className="form-group">
                        <label className="label">Price (BHD)</label>
                        <input
                            type="number"
                            name="price"
                            className="input"
                            placeholder="e.g., 2.50 (enter 0 for free)"
                            min="0"
                            step="0.01"
                            defaultValue={editingAttraction?.price || 0}
                        />
                    </div>

                    {/* Photo Gallery Section - Only show when editing */}
                    {editingAttraction && (
                        <>
                            <hr style={{ margin: '24px 0', border: '1px solid #eee' }} />

                            <div className="form-group">
                                <label className="label">Photo Gallery ({photos.length} photos)</label>

                                {loadingPhotos ? (
                                    <div className="text-muted">Loading photos...</div>
                                ) : (
                                    <>
                                        <div className="photo-gallery">
                                            {photos.map((photo) => (
                                                <div key={photo.id} className="photo-item">
                                                    <img
                                                        src={photo.url || 'https://via.placeholder.com/150?text=No+Image'}
                                                        alt="Attraction"
                                                        className="photo-thumbnail"
                                                        onError={(e) => {
                                                            e.currentTarget.src = 'https://via.placeholder.com/150?text=No+Image';
                                                        }}
                                                    />
                                                    {photo.is_primary === 1 && (
                                                        <span className="badge badge-primary photo-badge">Primary</span>
                                                    )}
                                                    <div className="photo-actions">
                                                        {photo.is_primary === 0 && (
                                                            <button
                                                                type="button"
                                                                className="btn btn-sm btn-secondary"
                                                                onClick={() => handleSetPrimary(photo.id)}
                                                            >
                                                                Set Primary
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-danger"
                                                            onClick={() => handleDeletePhoto(photo.id)}
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="add-photo-section">
                                            <label className="label">Add New Photo</label>
                                            <div className="flex gap-sm">
                                                <input
                                                    type="text"
                                                    className="input"
                                                    placeholder="http://192.168.100.38:3000/public/images/attractions/{id}/photo.jpg"
                                                    value={newPhotoUrl}
                                                    onChange={(e) => setNewPhotoUrl(e.target.value)}
                                                />
                                                <button
                                                    type="button"
                                                    className="btn btn-primary"
                                                    onClick={handleAddPhoto}
                                                    disabled={!newPhotoUrl.trim()}
                                                >
                                                    ➕ Add
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </>
                    )}
                </form>
            </Modal>
        </div>
    );
};

export default Attractions;
