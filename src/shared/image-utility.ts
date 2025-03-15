import { GeneratedImageInfo } from './types';

/**
 * ImageUtility class - Provides utility functions for image processing
 */
export class ImageUtility {
  /**
   * Create an image card element for the grid view
   * @param base64Data - Base64 encoded image data
   * @param index - Index of the image in the array
   * @param clickHandler - Handler function for when the card is clicked
   */
  static createImageCard(base64Data: string, index: number, clickHandler: (index: number) => void): HTMLDivElement {
    // Create a card element
    const colDiv = document.createElement("div");
    colDiv.className = "col";
    
    const cardDiv = document.createElement("div");
    cardDiv.className = "card h-100";
    
    const imgElement = document.createElement("img");
    imgElement.src = base64Data;
    imgElement.className = "card-img-top";
    imgElement.alt = `Generated image ${index + 1}`;
    
    // Add click handler to open in lightbox
    imgElement.addEventListener("click", () => {
      clickHandler(index);
    });
    
    cardDiv.appendChild(imgElement);
    colDiv.appendChild(cardDiv);
    
    return colDiv;
  }
  
  /**
   * Convert a blob to a JPEG data URL with highest quality
   * @param blob - The image blob to convert
   */
  static convertBlobToJpeg(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = function() {
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
   * Fetch images from the server and convert to base64
   * @param images - Array of image info objects
   * @param serverBaseUrl - Base URL of the ComfyUI server
   */
  static async fetchAllImages(images: GeneratedImageInfo[], serverBaseUrl: string = 'http://127.0.0.1:8000'): Promise<GeneratedImageInfo[]> {
    const fetchPromises = images.map(async (imageInfo, index) => {
      try {
        const viewUrl = `${serverBaseUrl}/view?filename=${encodeURIComponent(imageInfo.filename)}&subfolder=${encodeURIComponent(imageInfo.subfolder)}&type=${encodeURIComponent(imageInfo.type)}`;
        
        const imageResponse = await fetch(viewUrl);
        const blob = await imageResponse.blob();
        
        // Convert to base64
        const base64Data = await ImageUtility.convertBlobToJpeg(blob);
        
        // Return a copy of the image info with the base64 data included
        return {
          ...imageInfo,
          base64: base64Data
        };
      } catch (err) {
        console.error("Error fetching image:", err);
        return {
          ...imageInfo,
          base64: '' // Return empty string on error
        };
      }
    });
    
    // Wait for all images to be processed
    return await Promise.all(fetchPromises);
  }
}