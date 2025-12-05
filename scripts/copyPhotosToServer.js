const fs = require('fs');
const path = require('path');

// Paths
const sourceDir = path.join(__dirname, '..', 'assets', 'AttractionsPhotos');
const destDir = path.join(__dirname, '..', 'server', 'public', 'images', 'attractions');

// Create destination directory if it doesn't exist
if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
}

// Copy all attraction photo folders
const attractionFolders = fs.readdirSync(sourceDir);

attractionFolders.forEach(folder => {
    const sourceFolderPath = path.join(sourceDir, folder);

    // Skip if not a directory
    if (!fs.statSync(sourceFolderPath).isDirectory()) {
        return;
    }

    const destFolderPath = path.join(destDir, folder);

    // Create destination folder
    if (!fs.existsSync(destFolderPath)) {
        fs.mkdirSync(destFolderPath, { recursive: true });
    }

    // Copy all photos in this folder
    const photos = fs.readdirSync(sourceFolderPath);
    photos.forEach(photo => {
        const sourcePhotoPath = path.join(sourceFolderPath, photo);
        const destPhotoPath = path.join(destFolderPath, photo);

        fs.copyFileSync(sourcePhotoPath, destPhotoPath);
        console.log(`Copied: ${folder}/${photo}`);
    });
});

console.log('\n✅ All attraction photos copied successfully!');
console.log(`📁 Location: ${destDir}`);
console.log('\n📝 Images are now accessible at:');
console.log('   http://192.168.100.38:3000/public/images/attractions/{id}/{photo.jpg}');
