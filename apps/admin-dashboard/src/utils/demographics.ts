import type { AgeGroup, AgeGroupDatum, UserDemographicsData } from '../types';

export const AGE_GROUPS: AgeGroup[] = ['18-24', '25-34', '35-44', '45+'];

export interface ReviewDemographicsRecord {
    id: string;
    user_id: string | null;
    age: number | null;
    nationality: unknown;
}

export interface ProfileDemographicsRecord {
    id: string;
    birthdate: string | null;
    nationality: unknown;
}

function normalizeAge(age: number | null | undefined) {
    if (typeof age !== 'number' || !Number.isFinite(age)) {
        return null;
    }

    const normalized = Math.floor(age);
    if (normalized < 1 || normalized > 120) {
        return null;
    }

    return normalized;
}

function normalizeNationality(name: string | null | undefined) {
    const trimmed = name?.trim();
    return trimmed ? trimmed : null;
}

function extractNationalityName(value: unknown) {
    if (typeof value === 'string') {
        return normalizeNationality(value);
    }

    if (Array.isArray(value)) {
        const firstItem = value[0];
        if (firstItem && typeof firstItem === 'object' && 'name' in firstItem) {
            return normalizeNationality(typeof firstItem.name === 'string' ? firstItem.name : null);
        }

        return null;
    }

    if (value && typeof value === 'object' && 'name' in value) {
        return normalizeNationality(typeof value.name === 'string' ? value.name : null);
    }

    return null;
}

export function calculateAgeFromBirthdate(birthdate: string | null, today = new Date()) {
    if (!birthdate) {
        return null;
    }

    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthdate);
    if (!match) {
        return null;
    }

    const birthYear = Number(match[1]);
    const birthMonth = Number(match[2]) - 1;
    const birthDay = Number(match[3]);

    let age = today.getFullYear() - birthYear;
    const birthdayPassed =
        today.getMonth() > birthMonth ||
        (today.getMonth() === birthMonth && today.getDate() >= birthDay);

    if (!birthdayPassed) {
        age -= 1;
    }

    return normalizeAge(age);
}

export function getAgeGroup(age: number | null | undefined): AgeGroup | null {
    const normalizedAge = normalizeAge(age);
    if (normalizedAge == null || normalizedAge < 18) {
        return null;
    }

    if (normalizedAge <= 24) {
        return '18-24';
    }

    if (normalizedAge <= 34) {
        return '25-34';
    }

    if (normalizedAge <= 44) {
        return '35-44';
    }

    return '45+';
}

function toDistributionData<TLabel extends string>(
    counts: Map<TLabel, number>,
    total: number
) {
    return Array.from(counts.entries())
        .map(([label, count]) => ({
            label,
            count,
            percentage: total > 0 ? (count / total) * 100 : 0,
        }))
        .sort((left, right) => right.count - left.count);
}

export function buildUserDemographicsData(
    reviews: ReviewDemographicsRecord[],
    profilesByUserId = new Map<string, ProfileDemographicsRecord>()
): UserDemographicsData {
    console.info('[UserDemographics] Aggregation helper started');

    try {
        const contributors = new Map<string, { age: number | null; nationality: string | null }>();

        for (const review of reviews) {
            const profile = review.user_id ? profilesByUserId.get(review.user_id) : undefined;
            const contributorKey = review.user_id ? `user:${review.user_id}` : `guest:${review.id}`;
            const resolvedAge = normalizeAge(review.age) ?? calculateAgeFromBirthdate(profile?.birthdate ?? null);
            const resolvedNationality =
                extractNationalityName(review.nationality) ??
                extractNationalityName(profile?.nationality);
            const existing = contributors.get(contributorKey);

            if (!existing) {
                contributors.set(contributorKey, {
                    age: resolvedAge,
                    nationality: resolvedNationality,
                });
                continue;
            }

            contributors.set(contributorKey, {
                age: existing.age ?? resolvedAge,
                nationality: existing.nationality ?? resolvedNationality,
            });
        }

        console.info(`[UserDemographics] Contributors aggregated: ${contributors.size}`);

        const nationalityCounts = new Map<string, number>();
        const ageGroupCounts = new Map<AgeGroup, number>(
            AGE_GROUPS.map((label) => [label, 0] as const)
        );

        let nationalitySampleCount = 0;
        let ageSampleCount = 0;

        for (const contributor of contributors.values()) {
            if (contributor.nationality) {
                nationalitySampleCount += 1;
                nationalityCounts.set(
                    contributor.nationality,
                    (nationalityCounts.get(contributor.nationality) || 0) + 1
                );
            }

            const ageGroup = getAgeGroup(contributor.age);
            if (ageGroup) {
                ageSampleCount += 1;
                ageGroupCounts.set(ageGroup, (ageGroupCounts.get(ageGroup) || 0) + 1);
            }
        }

        console.info(
            `[UserDemographics] Sample counts computed: nationality=${nationalitySampleCount}, age=${ageSampleCount}`
        );

        const nationalityDistribution = toDistributionData(nationalityCounts, nationalitySampleCount);
        const ageGroupDistribution = AGE_GROUPS.map<AgeGroupDatum>((label) => ({
            label,
            count: ageGroupCounts.get(label) || 0,
            percentage: ageSampleCount > 0 ? ((ageGroupCounts.get(label) || 0) / ageSampleCount) * 100 : 0,
        }));

        console.info(
            `[UserDemographics] Distribution sizes built: nationalities=${nationalityDistribution.length}, ageGroups=${ageGroupDistribution.length}`
        );

        const result = {
            review_count: reviews.length,
            contributor_count: contributors.size,
            nationality_sample_count: nationalitySampleCount,
            age_sample_count: ageSampleCount,
            nationality_distribution: nationalityDistribution,
            age_group_distribution: ageGroupDistribution,
        };

        console.info(
            `[UserDemographics] Aggregation helper finished: reviews=${result.review_count}, contributors=${result.contributor_count}, nationalitySamples=${result.nationality_sample_count}, ageSamples=${result.age_sample_count}`
        );

        return result;
    } catch (error) {
        console.log('[UserDemographics] Aggregation helper failed:', error);
        console.error('[UserDemographics] Aggregation helper failed:', error);
        throw error;
    }
}

export function hasDemographicsData(data: UserDemographicsData | null) {
    return Boolean(data) && (data.nationality_sample_count > 0 || data.age_sample_count > 0);
}
