import { z } from 'zod';

// Review payload validator
export const ReviewSchema = z.object({
    attraction_id: z.number(),
    name: z.string().min(1),
    comment: z.string(),
    rating: z.number().min(0).max(5),
    price_rating: z.number().optional().default(0),
    cleanliness_rating: z.number().optional().default(0),
    service_rating: z.number().optional().default(0),
    experience_rating: z.number().optional().default(0),
});

// Itinerary payload validator
export const ItinerarySchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    is_public: z.boolean().optional(),
    creator_name: z.string().optional(),
    attractions: z.array(z.number()).optional(),
});

export type ReviewPayload = z.infer<typeof ReviewSchema>;
export type ItineraryPayload = z.infer<typeof ItinerarySchema>;
