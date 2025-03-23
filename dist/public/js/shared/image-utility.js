export class ImageUtility {
    static createImageCard(base64Data, index, clickHandler) {
        const colDiv = document.createElement("div");
        colDiv.className = "col";
        const cardDiv = document.createElement("div");
        cardDiv.className = "card h-100";
        const imgElement = document.createElement("img");
        imgElement.src = base64Data;
        imgElement.className = "card-img-top";
        imgElement.alt = `Generated image ${index + 1}`;
        imgElement.addEventListener("click", () => {
            clickHandler(index);
        });
        cardDiv.appendChild(imgElement);
        colDiv.appendChild(cardDiv);
        return colDiv;
    }
    static convertBlobToJpeg(blob) {
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
                const jpegDataUrl = canvas.toDataURL("image/jpeg", 1.0);
                resolve(jpegDataUrl);
            };
            img.onerror = reject;
            img.src = URL.createObjectURL(blob);
        });
    }
    static async fetchAllImages(images, serverBaseUrl = 'http://127.0.0.1:8000') {
        const fetchPromises = images.map(async (imageInfo, index) => {
            try {
                const viewUrl = `${serverBaseUrl}/view?filename=${encodeURIComponent(imageInfo.filename)}&subfolder=${encodeURIComponent(imageInfo.subfolder)}&type=${encodeURIComponent(imageInfo.type)}`;
                const imageResponse = await fetch(viewUrl);
                const blob = await imageResponse.blob();
                const base64Data = await ImageUtility.convertBlobToJpeg(blob);
                return {
                    ...imageInfo,
                    base64: base64Data
                };
            }
            catch (err) {
                console.error("Error fetching image:", err);
                return {
                    ...imageInfo,
                    base64: ''
                };
            }
        });
        return await Promise.all(fetchPromises);
    }
}
