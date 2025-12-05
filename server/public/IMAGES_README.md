# Attraction Photos Setup

## 📁 Photo Organization

Photos are organized by attraction ID:
```
server/public/images/attractions/
├── 1/                    (Bahrain Fort photos)
│   ├── Bahrain_Fort_March_2015.jpg
│   └── Screenshot 2025-11-23 204443.jpg
├── 2/                    (Bab Al Bahrain photos)
│   ├── 240108-manama-souq-bab-al-bahrain-4k.jpg
│   └── 9897_upload65e570cdd0f27_1709535437-01709535442.jpeg
└── ...
```

## 🔄 How It Works

### Mobile App (React Native)
- Loads photos using `require()` from `assets/AttractionsPhotos/{id}/`
- Displays multiple photos in a gallery
- Uses the `attractionPhotos.ts` helper to get photos by attraction ID

### Admin Dashboard (Web)
- References photos via HTTP URL
- Uses the first photo as the "main" image
- Format: `http://192.168.100.38:3000/public/images/attractions/{id}/photo.jpg`

### Server
- Serves photos from `public/images/attractions/`
- Accessible at `/public/images/attractions/{id}/{filename}`

## ➕ Adding Photos for New Attractions

When creating a new attraction:

1. **Create a folder** with the attraction's ID:
   ```
   server/public/images/attractions/{new_id}/
   ```

2. **Add photos** to that folder:
   ```
   server/public/images/attractions/{new_id}/photo1.jpg
   server/public/images/attractions/{new_id}/photo2.jpg
   ```

3. **In the admin dashboard**, enter the main photo URL:
   ```
   http://192.168.100.38:3000/public/images/attractions/{id}/photo1.jpg
   ```

4. **For the mobile app**, update `src/utils/attractionPhotos.ts`:
   ```typescript
   export const attractionPhotos: { [key: number]: any[] } = {
       ...
       {new_id}: [
           require('../../assets/AttractionsPhotos/{new_id}/photo1.jpg'),
           require('../../assets/AttractionsPhotos/{new_id}/photo2.jpg'),
       ],
   };
   ```

5. **Copy photos** to mobile app assets:
   ```
   assets/AttractionsPhotos/{new_id}/photo1.jpg
   assets/AttractionsPhotos/{new_id}/photo2.jpg
   ```

## 🔄 Migration Script

The `scripts/copyPhotosToServer.js` script automatically copies all photos from `assets/AttractionsPhotos/` to `server/public/images/attractions/`.

Run it anytime you add new photos to the assets folder:
```bash
node scripts/copyPhotosToServer.js
```

## 🌐 Access URLs

After copying, photos are accessible at:
- Local: `http://192.168.100.38:3000/public/images/attractions/{id}/{filename}`
- Web Dashboard: Uses these URLs
- Mobile App: Uses local `require()` from assets folder

## ✅ Current Photos

All existing attraction photos (IDs 1-5) have been copied to the server and are ready to use!
