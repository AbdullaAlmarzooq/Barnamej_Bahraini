import { useState, useEffect } from 'react';
import { fetchReviews, deleteReview } from '../api/client';
import { type Review } from '../types';
import './Reviews.css';

const Reviews = () => {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadReviews();
    }, []);

    const loadReviews = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await fetchReviews();
            setReviews(data);
        } catch (err) {
            setError('Failed to load reviews');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this review?')) {
            return;
        }

        try {
            await deleteReview(id);
            await loadReviews();
        } catch (err) {
            alert('Failed to delete review');
            console.error(err);
        }
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="reviews-page">
            <div className="page-header">
                <div>
                    <h1>Reviews Management</h1>
                    <p className="text-muted">Moderate and manage user reviews</p>
                </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="card">
                <div className="reviews-list">
                    {reviews.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">⭐</div>
                            <p>No reviews available</p>
                        </div>
                    ) : (
                        reviews.map((review) => (
                            <div key={review.id} className="review-item">
                                <div className="review-header">
                                    <div>
                                        <strong>{review.name}</strong>
                                        <span className="text-muted text-sm ml-sm">
                                            {new Date(review.created_at).toLocaleDateString()}
                                        </span>
                                        <div className="text-sm font-bold text-primary mt-1">
                                            📍 {review.attraction_name || 'Unknown Attraction'}
                                        </div>
                                        <div className="text-xs text-muted mt-1">
                                            {review.age ? `Age: ${review.age}` : ''}
                                            {review.age && review.nationality ? ' • ' : ''}
                                            {review.nationality ? `from ${review.nationality}` : ''}
                                        </div>
                                    </div>
                                    <button
                                        className="btn btn-danger btn-sm"
                                        onClick={() => handleDelete(review.id)}
                                    >
                                        🗑️ Delete
                                    </button>
                                </div>

                                <div className="review-ratings">
                                    <div className="rating-item">
                                        <span className="rating-label">Overall:</span>
                                        <span className="rating-value">⭐ {review.rating?.toFixed(1) || 'N/A'}</span>
                                    </div>
                                    <div className="rating-item">
                                        <span className="rating-label">Price:</span>
                                        <span className="rating-value">{review.price_rating || 0}/5</span>
                                    </div>
                                    <div className="rating-item">
                                        <span className="rating-label">Cleanliness:</span>
                                        <span className="rating-value">{review.cleanliness_rating || 0}/5</span>
                                    </div>
                                    <div className="rating-item">
                                        <span className="rating-label">Service:</span>
                                        <span className="rating-value">{review.service_rating || 0}/5</span>
                                    </div>
                                    <div className="rating-item">
                                        <span className="rating-label">Experience:</span>
                                        <span className="rating-value">{review.experience_rating || 0}/5</span>
                                    </div>
                                </div>

                                <div className="review-comment">
                                    {review.comment}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default Reviews;
