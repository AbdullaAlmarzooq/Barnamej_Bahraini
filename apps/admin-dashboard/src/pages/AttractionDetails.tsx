import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchAttraction, fetchReviews } from '../api/client';
import { getPhotoUrl } from '../api/photos';
import { type Attraction, type Review } from '../types';
import './AttractionDetails.css';

const AttractionDetails = () => {
    const { id } = useParams<{ id: string }>();
    const [attraction, setAttraction] = useState<Attraction | null>(null);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;
        loadData(id);
    }, [id]);

    const loadData = async (attractionId: string) => {
        try {
            setLoading(true);
            setError(null);
            const [attractionData, reviewData] = await Promise.all([
                fetchAttraction(attractionId),
                fetchReviews(attractionId)
            ]);
            setAttraction(attractionData);
            setReviews(reviewData);
        } catch (err) {
            setError('Failed to load attraction details');
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

    if (error || !attraction) {
        return (
            <div className="error-message">
                {error || 'Attraction not found'}
            </div>
        );
    }

    return (
        <div className="attraction-details-page">
            <div className="page-header">
                <div>
                    <h1>Attraction Details</h1>
                    <p className="text-muted">View attraction information and all related reviews</p>
                </div>
                <Link to="/admin/attractions" className="btn btn-secondary">
                    ← Back to Attractions
                </Link>
            </div>

            <div className="card details-card">
                <div className="card-header">
                    <h2 className="card-title">{attraction.name}</h2>
                </div>
                <div className="details-grid">
                    <div className="form-group">
                        <label className="label">Name</label>
                        <input className="input" value={attraction.name} disabled />
                    </div>
                    <div className="form-group">
                        <label className="label">Category</label>
                        <input className="input" value={attraction.category} disabled />
                    </div>
                    <div className="form-group full-width">
                        <label className="label">Description</label>
                        <textarea className="textarea" value={attraction.description || ''} disabled />
                    </div>
                    <div className="form-group">
                        <label className="label">Location</label>
                        <input className="input" value={attraction.location || ''} disabled />
                    </div>
                    <div className="form-group">
                        <label className="label">Average Rating</label>
                        <input className="input" value={(attraction.avg_rating || 0).toFixed(1)} disabled />
                    </div>
                    <div className="form-group">
                        <label className="label">Total Reviews</label>
                        <input className="input" value={attraction.total_reviews || 0} disabled />
                    </div>
                    <div className="form-group">
                        <label className="label">Price (BHD)</label>
                        <input className="input" value={(attraction.price || 0).toFixed(2)} disabled />
                    </div>
                    <div className="form-group">
                        <label className="label">Estimated Duration (min)</label>
                        <input
                            className="input"
                            value={attraction.estimated_duration_minutes || 0}
                            disabled
                        />
                    </div>
                </div>

                <div className="details-section">
                    <h3 className="section-title">Photo Gallery</h3>
                    {attraction.photos && attraction.photos.length > 0 ? (
                        <div className="photo-gallery">
                            {attraction.photos.map((photo) => (
                                <div key={photo.id} className="photo-item">
                                    <img
                                        src={
                                            photo.storage_path
                                                ? getPhotoUrl(photo.storage_path, photo.storage_bucket)
                                                : "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Crect fill='%23ddd' width='80' height='80'/%3E%3Ctext fill='%23999' x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle' font-family='Arial' font-size='10'%3ENo Image%3C/text%3E%3C/svg%3E"
                                        }
                                        alt={photo.alt_text || 'Attraction'}
                                        className="photo-thumbnail"
                                    />
                                    {photo.is_primary && (
                                        <span className="badge badge-primary photo-badge">Primary</span>
                                    )}
                                    <div className="photo-meta">
                                        <span className="text-sm text-muted">{photo.caption || 'No caption'}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-muted">No photos available.</div>
                    )}
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">Reviews ({reviews.length})</h2>
                </div>
                <div className="reviews-list">
                    {reviews.length === 0 ? (
                        <div className="text-muted">No reviews for this attraction yet.</div>
                    ) : (
                        reviews.map((review) => (
                            <div className="review-item" key={review.id}>
                                <div className="review-header">
                                    <div>
                                        <div className="font-bold">
                                            {review.reviewer_name || 'Anonymous'}
                                            {review.age ? `, ${review.age}` : ''}
                                        </div>
                                        <div className="text-sm text-muted">
                                            {review.nationality?.name || review.nationality_id || 'Nationality not set'}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="badge badge-secondary">{review.status}</div>
                                        <div className="text-sm text-muted">
                                            {new Date(review.created_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>

                                <div className="review-ratings">
                                    <div className="rating-item">
                                        <span className="rating-label">Price</span>
                                        <span className="rating-value">{review.price_rating}</span>
                                    </div>
                                    <div className="rating-item">
                                        <span className="rating-label">Cleanliness</span>
                                        <span className="rating-value">{review.cleanliness_rating}</span>
                                    </div>
                                    <div className="rating-item">
                                        <span className="rating-label">Service</span>
                                        <span className="rating-value">{review.service_rating}</span>
                                    </div>
                                    <div className="rating-item">
                                        <span className="rating-label">Experience</span>
                                        <span className="rating-value">{review.experience_rating}</span>
                                    </div>
                                    <div className="rating-item">
                                        <span className="rating-label">Overall</span>
                                        <span className="rating-value">{review.overall_rating.toFixed(1)}</span>
                                    </div>
                                </div>

                                <div className="review-comment">
                                    {review.comment || 'No comment provided.'}
                                </div>

                                {(!!review.moderation_notes || (review.helpful_count ?? 0) > 0) && (
                                    <div className="review-meta">
                                        {review.moderation_notes && (
                                            <div className="text-sm text-muted">
                                                Moderation notes: {review.moderation_notes}
                                            </div>
                                        )}
                                        {review.helpful_count > 0 && (
                                            <div className="text-sm text-muted">
                                                Helpful votes: {review.helpful_count}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default AttractionDetails;
