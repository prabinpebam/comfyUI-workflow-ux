/**
 * Generate a unique ID using crypto.randomUUID if available, or a fallback method
 */
export function generateUniqueId() {
    return (crypto.randomUUID)
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2);
}
/**
 * Helper function to convert a blob to a JPEG data URL with highest quality
 */
export function convertBlobToJpeg(blob) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = function () {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
                reject(new Error("Could not get 2d context"));
                return;
            }
            ctx.drawImage(img, 0, 0);
            // Convert to JPEG with quality 1.0
            const jpegDataUrl = canvas.toDataURL("image/jpeg", 1.0);
            resolve(jpegDataUrl);
        };
        img.onerror = reject;
        img.src = URL.createObjectURL(blob);
    });
}
/**
 * Helper function to slugify text for use in IDs and URLs
 */
export function slugify(text) {
    return text.toString().toLowerCase().trim()
        .replace(/\s+/g, '-') // Replace spaces with -
        .replace(/[^\w\-]+/g, '') // Remove all non-word chars
        .replace(/\-\-+/g, '-') // Replace multiple - with single -
        .replace(/^-+/, '') // Trim - from start of text
        .replace(/-+$/, ''); // Trim - from end of text
}
/**
 * Format file size in a human-readable format
 */
export function formatFileSize(bytes) {
    if (bytes === 0)
        return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
/**
 * Check if local storage is available and has sufficient space
 */
export function checkLocalStorageAvailability() {
    try {
        const storage = window.localStorage;
        const testKey = '__storage_test__';
        storage.setItem(testKey, testKey);
        storage.removeItem(testKey);
        return true;
    }
    catch (e) {
        return false;
    }
}
/**
 * Get estimated local storage usage
 */
export function getLocalStorageUsage() {
    let totalSize = 0;
    const items = [];
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) {
                const value = localStorage.getItem(key);
                if (value) {
                    // Multiply by 2 for UTF-16 encoding
                    const size = (value.length * 2);
                    totalSize += size;
                    items.push({ key, size });
                }
            }
        }
    }
    catch (e) {
        console.error("Error calculating localStorage usage:", e);
    }
    return { totalSize, items };
}
//# sourceMappingURL=utils.js.map