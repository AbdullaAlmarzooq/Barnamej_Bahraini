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

    const handleDelete = async (id: string) => {
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
                <div className="table-container reviews-table-container">
                    <table className="table reviews-table">
                        <thead>
                            <tr>
                                <th>Reviewer</th>
                                <th>Attraction</th>
                                <th>Ratings</th>
                                <th>Comment</th>
                                <th>Date</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reviews.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center text-muted">
                                        No reviews available
                                    </td>
                                </tr>
                            ) : (
                                reviews.map((review) => {
                                    const demographics = [
                                        review.age ? `Age ${review.age}` : null,
                                        review.nationality?.name || null,
                                    ].filter(Boolean).join(' • ')

                                    return (
                                        <tr key={review.id}>
                                            <td>
                                                <div className="reviewer-cell">
                                                    <strong>{review.reviewer_name || 'Anonymous'}</strong>
                                                    {demographics && (
                                                        <span className="text-sm text-muted">{demographics}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td>{review.attraction?.name || 'Unknown Attraction'}</td>
                                            <td>
                                                <div className="overall-rating">⭐ {(review.overall_rating || 0).toFixed(1)}</div>
                                                <div className="criteria-rating text-sm text-muted">
                                                    P {review.price_rating || 0} • C {review.cleanliness_rating || 0} • S {review.service_rating || 0} • E {review.experience_rating || 0}
                                                </div>
                                            </td>
                                            <td className="review-comment-cell">
                                                {review.comment || 'No comment'}
                                            </td>
                                            <td className="text-sm text-muted">
                                                {new Date(review.created_at).toLocaleDateString()}
                                            </td>
                                            <td>
                                                <button
                                                    className="btn btn-danger btn-sm"
                                                    onClick={() => handleDelete(review.id)}
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Reviews;
