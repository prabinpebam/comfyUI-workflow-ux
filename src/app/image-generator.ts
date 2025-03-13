import { Workflow } from '../shared/types';
import { NoiseAnimation } from '../shared/noise-animation.js';

/**
 * ImageGenerator class - Handles the generation and display of images
 */
export class ImageGenerator {
  // DOM elements
  private progressDiv: HTMLElement;
  private generatedGrid: HTMLDivElement;
  private noiseCanvas: HTMLCanvasElement;
  
  // State properties
  private noiseAnim: NoiseAnimation;
  private currentWorkflow: Workflow = {};
  private selectedImageBase64: string | null = null;
  private isPolling: boolean = false;
  private promptId: string | undefined;
  
  /**
   * Constructor for the ImageGenerator class
   * @param progressElement - Element to display progress/status messages
   * @param gridElement - Element to display generated images
   * @param canvasElement - Canvas element for noise animation
   */
  constructor(
    progressElement: HTMLElement,
    gridElement: HTMLDivElement,
    canvasElement: HTMLCanvasElement
  ) {
    this.progressDiv = progressElement;
    this.generatedGrid = gridElement;
    this.noiseCanvas = canvasElement;
    
    // Initialize noise animation
    this.noiseAnim = new NoiseAnimation(canvasElement);
    this.noiseAnim.stop();
    this.noiseCanvas.style.display = "none";
  }
  
  /**
   * Generate a background image using the provided workflow
   * @param workflow - The workflow data to use for generation
   */
  async generateBackground(workflow: Workflow): Promise<void> {
    // When generation starts, hide any generated images
    let imagesContainer = document.getElementById("imagesContainer");
    if (!imagesContainer) {
      imagesContainer = document.createElement("div");
      imagesContainer.id = "imagesContainer";
      this.generatedGrid.appendChild(imagesContainer);
    }
    imagesContainer.style.display = "none";
  
    // Ensure noiseCanvas is visible and start noise animation
    this.noiseCanvas.style.display = "block";
    this.noiseAnim.start();
  
    this.progressDiv.textContent = "Loading workflow...";
    try {
      const workflowResponse = await fetch("./../workflow/Win11-stylized-wallpaper/Win11-stylized-wallpaper.json");
      if (!workflowResponse.ok) throw new Error("Failed to load workflow JSON.");
      const baseWorkflow = await workflowResponse.json() as Workflow;
      
      // Merge the provided workflow with base workflow if it exists
      this.currentWorkflow = workflow ? { ...baseWorkflow, ...workflow } : baseWorkflow;
  
      this.progressDiv.textContent = "Workflow loaded. Starting background generation...";
  
      const clientId = (crypto.randomUUID)
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2);
  
      // Open WebSocket connection for progress updates
      const ws = new WebSocket(`ws://127.0.0.1:8000/ws?clientId=${clientId}`);
      ws.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log("WebSocket message:", message);
          if (message.type === "progress") {
            this.progressDiv.textContent = `Progress: ${message.data.value} / ${message.data.max}`;
          } else if (message.type === "executing") {
            this.progressDiv.textContent = `Executing node: ${message.data.node}`;
          } else if (message.type === "execution_cached") {
            this.progressDiv.textContent = `Cached execution: ${JSON.stringify(message.data)}`;
          } else if (message.type === "executed" && message.data.prompt_id === this.promptId) {
            const nodeId = message.data.node;
            // Only consider nodes with PreviewImage class_type
            if (this.currentWorkflow[nodeId] && this.currentWorkflow[nodeId].class_type === "PreviewImage") {
              this.progressDiv.textContent = `Preview node (${nodeId}) executed. Checking for generated images...`;
              if (!this.isPolling) {
                this.pollForPreview();
              }
            }
          }
        } catch (error) {
          console.error("Error processing WebSocket message:", error);
        }
      };
  
      // Send the modified workflow JSON to the server
      const response = await fetch("http://127.0.0.1:8000/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: this.currentWorkflow,
          client_id: clientId
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        this.progressDiv.textContent = "Error sending prompt to server: " + errorText;
        throw new Error("Server error: " + errorText);
      }
      
      const data = await response.json();
      this.promptId = data.prompt_id;
      console.log("Prompt ID:", this.promptId);
    } catch (error) {
      console.error("Error during background generation:", error);
      this.progressDiv.textContent = "Error: " + (error instanceof Error ? error.message : String(error));
    }
  }
  
  /**
   * Poll for preview images to be ready
   */
  private async pollForPreview(): Promise<void> {
    this.isPolling = true;
    const maxAttempts = 20;
    let attempts = 0;
    const pollInterval = 1000;

    interface NodeOutput {
      images: Array<{
        filename: string;
        subfolder: string;
        type: string;
      }>,
    }
    
    const poll = async () => {
      attempts++;
      try {
        if (!this.promptId) {
          throw new Error("No prompt ID available");
        }
        
        const historyResponse = await fetch(`http://127.0.0.1:8000/history/${this.promptId}`);
        if (!historyResponse.ok) throw new Error("Failed to fetch history.");
        const historyData = await historyResponse.json();
        
        let allImages: Array<{filename: string; subfolder: string; type: string}> = [];
        const outputs = historyData[this.promptId]?.outputs;
        if (outputs) {
          for (const nodeId in outputs) {
            if (this.currentWorkflow[nodeId] && this.currentWorkflow[nodeId].class_type === "PreviewImage") {
              const nodeOutput = outputs[nodeId] as NodeOutput;
              if (nodeOutput.images && nodeOutput.images.length > 0) {
                allImages = allImages.concat(nodeOutput.images);
              }
            }
          }
          
          // Remove duplicates
          const uniqueImages: Array<{filename: string, subfolder: string, type: string}> = [];
          const seen = new Set();
          allImages.forEach((img: {filename: string, subfolder: string, type: string}) => {
            const key = img.filename + "_" + img.subfolder;
            if (!seen.has(key)) {
              seen.add(key);
              uniqueImages.push(img);
            }
          });
          
          if (uniqueImages.length > 0) {
            this.progressDiv.textContent = "Generation completed. Preview images available.";
            this.noiseAnim.stop();
            this.noiseCanvas.style.display = "none";
  
            let imagesContainer = document.getElementById("imagesContainer");
            if (!imagesContainer) {
              imagesContainer = document.createElement("div");
              imagesContainer.id = "imagesContainer";
              this.generatedGrid.appendChild(imagesContainer);
            }
            imagesContainer.innerHTML = "";
            imagesContainer.style.display = "grid";
  
            this.displayImages(uniqueImages, imagesContainer);
            this.isPolling = false;
            return;
          }
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
      
      if (attempts < maxAttempts) {
        setTimeout(poll, pollInterval);
      } else {
        this.progressDiv.textContent = "Timeout waiting for preview images.";
        this.isPolling = false;
      }
    };
    
    poll();
  }
  
  /**
   * Display the generated images in the container
   */
  private displayImages(images: Array<{filename: string, subfolder: string, type: string}>, container: HTMLElement): void {
    images.forEach(async (imageInfo) => {
      const viewUrl = `http://127.0.0.1:8000/view?filename=${encodeURIComponent(imageInfo.filename)}&subfolder=${encodeURIComponent(imageInfo.subfolder)}&type=${encodeURIComponent(imageInfo.type)}`;
      
      try {
        const imageResponse = await fetch(viewUrl);
        const blob = await imageResponse.blob();
        
        // Convert the fetched blob to a JPEG data URL
        const base64Data = await this.convertBlobToJpeg(blob);
        
        const imgElem = document.createElement("img");
        imgElem.src = base64Data;
        imgElem.dataset.base64 = base64Data;
        
        imgElem.addEventListener("click", () => {
          Array.from(container.getElementsByTagName("img")).forEach(img => {
            img.classList.remove("selected");
          });
          
          imgElem.classList.add("selected");
          this.selectedImageBase64 = imgElem.dataset.base64 || null;
          
          if (this.selectedImageBase64) {
            try {
              const previousImage = localStorage.getItem("backgroundImage");
              if (previousImage) {
                console.log("Removing previous background image from local storage.");
                localStorage.removeItem("backgroundImage");
              }
              
              localStorage.setItem("backgroundImage", this.selectedImageBase64);
              document.body.style.backgroundImage = `url(${this.selectedImageBase64})`;
              document.body.style.backgroundSize = "cover";
              document.body.style.backgroundPosition = "center";
              this.progressDiv.textContent = "Background image saved to local storage.";
              
              const storedImageSize = (this.selectedImageBase64.length * 2) / 1024;
              console.log(`Stored background image size: ${storedImageSize.toFixed(2)} KB`);
              
              let totalSize = 0;
              console.log("Current local storage items:");
              for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key) {
                  const value = localStorage.getItem(key);
                  if (value) {
                    const size = (value.length * 2) / 1024;
                    totalSize += size;
                    console.log(`- ${key}: ${size.toFixed(2)} KB`);
                  }
                }
              }
              console.log(`Total local storage size: ${totalSize.toFixed(2)} KB`);
            } catch (e) {
              if (e instanceof Error && e.name === 'QuotaExceededError') {
                console.error("Local storage quota exceeded. Unable to save background image.");
                this.progressDiv.textContent = "Error: Local storage quota exceeded. Unable to save background image.";
              } else {
                console.error("Error saving background image:", e);
                this.progressDiv.textContent = "Error saving background image: " + (e instanceof Error ? e.message : String(e));
              }
            }
          }
        });
        
        container.appendChild(imgElem);
      } catch (err) {
        console.error("Error fetching image:", err);
      }
    });
  }
  
  /**
   * Convert a blob to a JPEG data URL with highest quality
   */
  private convertBlobToJpeg(blob: Blob): Promise<string> {
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
}