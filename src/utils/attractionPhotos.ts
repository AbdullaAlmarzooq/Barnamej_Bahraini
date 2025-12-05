// Image mapping for attraction photos
// Since require() paths must be static, we map each attraction ID to its photos

export const attractionPhotos: { [key: number]: any[] } = {
    1: [
        require('../../assets/AttractionsPhotos/1/Bahrain_Fort_March_2015.jpg'),
        require('../../assets/AttractionsPhotos/1/Screenshot 2025-11-23 204443.jpg'),
    ],
    2: [
        require('../../assets/AttractionsPhotos/2/240108-manama-souq-bab-al-bahrain-4k.jpg'),
        require('../../assets/AttractionsPhotos/2/9897_upload65e570cdd0f27_1709535437-01709535442.jpeg'),
    ],
    3: [
        require('../../assets/AttractionsPhotos/3/Screenshot 2025-11-23 204512.png'),
        require('../../assets/AttractionsPhotos/3/photo0jpg.jpg'),
    ],
    4: [
        require('../../assets/AttractionsPhotos/4/Screenshot 2025-11-23 204601.png'),
        require('../../assets/AttractionsPhotos/4/photo0jpg (1).jpg'),
    ],
    5: [
        require('../../assets/AttractionsPhotos/5/national-theatre-of-bahrain.jpg'),
        require('../../assets/AttractionsPhotos/5/national_museum_3-1202x800.jpg'),
    ],
};

// Helper to get photos for an attraction
export const getPhotosForAttraction = (attractionId: number): any[] => {
    return attractionPhotos[attractionId] || [];
};

// Helper to get the first photo for list views
export const getFirstPhoto = (attractionId: number): any => {
    const photos = attractionPhotos[attractionId];
    return photos && photos.length > 0 ? photos[0] : null;
};
