import { NoiseAnimation } from '../shared/noise-animation.js';
/**
 * ImageGenerator class - Handles the generation and display of images
 */
export class ImageGenerator {
    /**
     * Constructor for the ImageGenerator class
     * @param statusElement - Element to display progress/status messages
     * @param generatedImagesGrid - Element to display generated images in a grid
     * @param noiseCanvas - Canvas element for noise animation
     * @param elapsedTimeElement - Element to display elapsed time
     * @param generationInProgressElement - Container element for generation-in-progress UI
     * @param emptyStateElement - Element for empty state UI
     * @param generatedImagesContainer - Container for generated images UI
     * @param lightboxElement - Lightbox element for fullscreen image viewing
     * @param lightboxImage - Image element within the lightbox
     */
    constructor(statusElement, generatedImagesGrid, noiseCanvas, elapsedTimeElement, generationInProgressElement, emptyStateElement, generatedImagesContainer, lightboxElement, lightboxImage) {
        this.currentWorkflow = {};
        this.selectedImageBase64 = null;
        this.isPolling = false;
        this.timerInterval = null;
        this.startTime = 0;
        this.generatedImages = [];
        this.currentLightboxIndex = 0;
        this.workflowCompleted = false;
        // Validate required DOM elements
        if (!statusElement)
            throw new Error("Status element is required");
        if (!generatedImagesGrid)
            throw new Error("Generated images grid element is required");
        if (!noiseCanvas)
            throw new Error("Noise canvas element is required");
        if (!elapsedTimeElement)
            throw new Error("Elapsed time element is required");
        if (!generationInProgressElement)
            throw new Error("Generation in progress element is required");
        if (!emptyStateElement)
            throw new Error("Empty state element is required");
        if (!generatedImagesContainer)
            throw new Error("Generated images container element is required");
        if (!lightboxElement)
            throw new Error("Lightbox element is required");
        if (!lightboxImage)
            throw new Error("Lightbox image element is required");
        this.statusElement = statusElement;
        this.generatedImagesGrid = generatedImagesGrid;
        this.noiseCanvas = noiseCanvas;
        this.elapsedTimeElement = elapsedTimeElement;
        this.generationInProgressElement = generationInProgressElement;
        this.emptyStateElement = emptyStateElement;
        this.generatedImagesContainer = generatedImagesContainer;
        this.lightboxElement = lightboxElement;
        this.lightboxImage = lightboxImage;
        // Initialize noise animation
        this.noiseAnim = new NoiseAnimation(noiseCanvas);
        this.noiseAnim.stop();
        // Setup lightbox navigation
        this.setupLightbox();
        // Initial UI state
        this.showEmptyStateUI();
    }
    /**
     * Initialize the lightbox controls
     */
    setupLightbox() {
        // Close lightbox button
        const closeLightbox = document.getElementById('closeLightbox');
        if (closeLightbox) {
            closeLightbox.addEventListener('click', () => this.hideLightbox());
        }
        // Previous image button
        const prevImage = document.getElementById('prevImage');
        if (prevImage) {
            prevImage.addEventListener('click', () => this.showPrevImage());
        }
        // Next image button
        const nextImage = document.getElementById('nextImage');
        if (nextImage) {
            nextImage.addEventListener('click', () => this.showNextImage());
        }
        // Handle keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (this.lightboxElement.style.display !== 'none') {
                if (e.key === 'Escape') {
                    this.hideLightbox();
                }
                else if (e.key === 'ArrowLeft') {
                    this.showPrevImage();
                }
                else if (e.key === 'ArrowRight') {
                    this.showNextImage();
                }
            }
        });
    }
    /**
     * Show the lightbox with a specific image
     */
    showLightbox(imageIndex) {
        if (imageIndex >= 0 && imageIndex < this.generatedImages.length && this.generatedImages[imageIndex].base64) {
            this.currentLightboxIndex = imageIndex;
            this.lightboxImage.src = this.generatedImages[imageIndex].base64 || '';
            this.lightboxElement.style.display = 'flex';
            // Update visibility of navigation buttons based on number of images
            const prevButton = document.getElementById('prevImage');
            const nextButton = document.getElementById('nextImage');
            if (prevButton && nextButton) {
                if (this.generatedImages.length <= 1) {
                    prevButton.style.display = 'none';
                    nextButton.style.display = 'none';
                }
                else {
                    prevButton.style.display = 'block';
                    nextButton.style.display = 'block';
                }
            }
        }
    }
    /**
     * Hide the lightbox
     */
    hideLightbox() {
        this.lightboxElement.style.display = 'none';
    }
    /**
     * Show the previous image in the lightbox
     */
    showPrevImage() {
        if (this.generatedImages.length <= 1)
            return;
        this.currentLightboxIndex--;
        if (this.currentLightboxIndex < 0) {
            this.currentLightboxIndex = this.generatedImages.length - 1;
        }
        if (this.generatedImages[this.currentLightboxIndex].base64) {
            this.lightboxImage.src = this.generatedImages[this.currentLightboxIndex].base64 || '';
        }
    }
    /**
     * Show the next image in the lightbox
     */
    showNextImage() {
        if (this.generatedImages.length <= 1)
            return;
        this.currentLightboxIndex++;
        if (this.currentLightboxIndex >= this.generatedImages.length) {
            this.currentLightboxIndex = 0;
        }
        if (this.generatedImages[this.currentLightboxIndex].base64) {
            this.lightboxImage.src = this.generatedImages[this.currentLightboxIndex].base64 || '';
        }
    }
    /**
     * Start the elapsed time counter
     */
    startTimer() {
        this.workflowCompleted = false;
        this.startTime = Date.now();
        this.updateElapsedTime();
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        this.timerInterval = window.setInterval(() => {
            this.updateElapsedTime();
        }, 1000);
    }
    /**
     * Stop the elapsed time counter
     */
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        // Make sure we show the final time
        this.updateElapsedTime();
    }
    /**
     * Update the elapsed time display with current duration
     */
    updateElapsedTime() {
        const elapsedMs = Date.now() - this.startTime;
        const elapsedSec = Math.floor(elapsedMs / 1000);
        const hours = Math.floor(elapsedSec / 3600);
        const minutes = Math.floor((elapsedSec % 3600) / 60);
        const seconds = elapsedSec % 60;
        const timeString = String(hours).padStart(2, '0') + ':' +
            String(minutes).padStart(2, '0') + ':' +
            String(seconds).padStart(2, '0');
        this.elapsedTimeElement.textContent = timeString;
    }
    /**
     * Show the generation in progress UI
     */
    showGenerationUI() {
        if (!this.emptyStateElement || !this.generatedImagesContainer || !this.generationInProgressElement) {
            console.error('Required DOM elements not found for UI state management');
            return;
        }
        this.emptyStateElement.classList.add('d-none');
        this.emptyStateElement.classList.remove('d-flex');
        this.generatedImagesContainer.style.display = 'none';
        this.generationInProgressElement.classList.remove('d-none');
        this.generationInProgressElement.classList.add('d-flex');
        this.noiseAnim.start();
    }
    /**
     * Show the generated images UI
     */
    showGeneratedImagesUI() {
        if (!this.emptyStateElement || !this.generatedImagesContainer || !this.generationInProgressElement) {
            console.error('Required DOM elements not found for UI state management');
            return;
        }
        this.emptyStateElement.classList.add('d-none');
        this.emptyStateElement.classList.remove('d-flex');
        this.generationInProgressElement.classList.add('d-none');
        this.generationInProgressElement.classList.remove('d-flex');
        this.generatedImagesContainer.style.display = 'block';
        this.workflowCompleted = true;
        this.stopTimer();
    }
    /**
     * Show the empty state UI
     */
    showEmptyStateUI() {
        if (!this.emptyStateElement || !this.generatedImagesContainer || !this.generationInProgressElement) {
            console.error('Required DOM elements not found for UI state management');
            return;
        }
        this.generationInProgressElement.classList.add('d-none');
        this.generationInProgressElement.classList.remove('d-flex');
        this.generatedImagesContainer.style.display = 'none';
        this.emptyStateElement.classList.remove('d-none');
        this.emptyStateElement.classList.add('d-flex');
    }
    /**
     * Generate a background image using the provided workflow
     * @param workflow - The workflow data to use for generation
     */
    async generateBackground(workflow) {
        // Reset state
        this.generatedImages = [];
        this.workflowCompleted = false;
        // Show generation in progress UI
        this.showGenerationUI();
        // Start the timer
        this.startTimer();
        this.statusElement.textContent = "Loading workflow...";
        console.log("[ImageGenerator] Starting generation process");
        try {
            let baseWorkflowPath = "";
            const workflowId = workflow.id;
            // Remove the id property from workflow before sending to server
            const workflowToSend = { ...workflow };
            delete workflowToSend.id;
            // Determine the workflow file path
            if (workflowId) {
                baseWorkflowPath = `workflow/${workflowId}/${workflowId}.json`;
            }
            else {
                // Default to Win11 for backwards compatibility
                baseWorkflowPath = "workflow/Win11-stylized-wallpaper/Win11-stylized-wallpaper.json";
            }
            console.log(`[ImageGenerator] Loading base workflow from: ${baseWorkflowPath}`);
            const workflowResponse = await fetch(baseWorkflowPath);
            if (!workflowResponse.ok)
                throw new Error("Failed to load workflow JSON.");
            const baseWorkflow = await workflowResponse.json();
            // Merge the base workflow with user provided parameter values
            this.currentWorkflow = { ...baseWorkflow };
            // Apply user editable values to the workflow
            for (const nodeId in workflowToSend) {
                if (nodeId !== 'id' && workflowToSend.hasOwnProperty(nodeId)) {
                    const node = workflowToSend[nodeId];
                    // Only update nodes that exist in the base workflow
                    if (this.currentWorkflow[nodeId] && typeof this.currentWorkflow[nodeId] !== 'string') {
                        if (typeof node === 'object' && node.inputs) {
                            // Update input parameters
                            for (const inputKey in node.inputs) {
                                if (node.inputs.hasOwnProperty(inputKey)) {
                                    const value = node.inputs[inputKey];
                                    // Ensure the target is an object with inputs
                                    if (!this.currentWorkflow[nodeId]) {
                                        this.currentWorkflow[nodeId] = { class_type: '', inputs: {} };
                                    }
                                    else if (typeof this.currentWorkflow[nodeId] === 'object' && !this.currentWorkflow[nodeId].inputs) {
                                        this.currentWorkflow[nodeId].inputs = {};
                                    }
                                    // Set the parameter value
                                    if (typeof this.currentWorkflow[nodeId] === 'object') {
                                        this.currentWorkflow[nodeId].inputs[inputKey] = value;
                                        console.log(`[ImageGenerator] Updated parameter: ${nodeId}.${inputKey} = ${JSON.stringify(value)}`);
                                    }
                                }
                            }
                        }
                    }
                }
            }
            this.statusElement.textContent = "Workflow loaded and parameters applied. Starting image generation...";
            console.log("[ImageGenerator] Workflow loaded and user parameters applied");
            const clientId = (crypto.randomUUID)
                ? crypto.randomUUID()
                : Math.random().toString(36).substring(2);
            console.log(`[ImageGenerator] Generated client ID: ${clientId}`);
            // Open WebSocket connection for progress updates
            const wsUrl = `ws://127.0.0.1:8000/ws?clientId=${clientId}`;
            console.log(`[ImageGenerator] Opening WebSocket connection to: ${wsUrl}`);
            const ws = new WebSocket(wsUrl);
            // Track completion for timing purposes
            let lastNodeExecuted = false;
            let previewNodesCount = 0;
            let previewNodesExecuted = 0;
            // Add WebSocket connection event handlers
            ws.onopen = () => {
                console.log("[WebSocket] Connection established");
                this.statusElement.textContent = "WebSocket connection established. Waiting for server...";
            };
            ws.onerror = (error) => {
                console.error("[WebSocket] Connection error:", error);
                this.statusElement.textContent = "WebSocket connection error. Check console for details.";
            };
            ws.onclose = (event) => {
                console.log(`[WebSocket] Connection closed. Code: ${event.code}, Reason: ${event.reason}`);
                if (!this.isPolling && !this.generatedImages.length) {
                    this.statusElement.textContent = "WebSocket connection closed. Generation may have failed.";
                }
            };
            // Find PreviewImage nodes to track overall completion
            for (const nodeId in this.currentWorkflow) {
                if (this.currentWorkflow[nodeId] &&
                    typeof this.currentWorkflow[nodeId] !== 'string' &&
                    this.currentWorkflow[nodeId].class_type === "PreviewImage") {
                    previewNodesCount++;
                }
            }
            ws.onmessage = async (event) => {
                try {
                    const message = JSON.parse(event.data);
                    console.log("[WebSocket] Received message:", message);
                    if (message.type === "progress") {
                        this.statusElement.textContent = `Progress: ${message.data.value} / ${message.data.max}`;
                    }
                    else if (message.type === "executing") {
                        this.statusElement.textContent = `Executing node: ${message.data.node}`;
                        lastNodeExecuted = false;
                    }
                    else if (message.type === "execution_cached") {
                        this.statusElement.textContent = `Cached execution: ${JSON.stringify(message.data)}`;
                    }
                    else if (message.type === "executed") {
                        const nodeId = message.data.node;
                        const node = this.currentWorkflow[nodeId];
                        if (node && typeof node !== 'string') {
                            if (node.class_type === "PreviewImage") {
                                previewNodesExecuted++;
                                this.statusElement.textContent = `Preview node (${nodeId}) executed. (${previewNodesExecuted}/${previewNodesCount})`;
                                // Only consider workflow complete when all preview nodes are executed
                                if (previewNodesExecuted >= previewNodesCount) {
                                    lastNodeExecuted = true;
                                    if (!this.isPolling) {
                                        this.pollForPreview();
                                    }
                                }
                            }
                        }
                    }
                }
                catch (error) {
                    console.error("[WebSocket] Error processing message:", error);
                }
            };
            // Send the workflow JSON to the server with all user parameters applied
            console.log("[ImageGenerator] Sending workflow to server");
            const promptPayload = {
                prompt: this.currentWorkflow,
                client_id: clientId
            };
            console.log("[ImageGenerator] Prompt payload:", promptPayload);
            const response = await fetch("http://127.0.0.1:8000/prompt", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(promptPayload)
            });
            if (!response.ok) {
                const errorText = await response.text();
                this.statusElement.textContent = "Error sending prompt to server: " + errorText;
                throw new Error("Server error: " + errorText);
            }
            const data = await response.json();
            this.promptId = data.prompt_id;
            console.log(`[ImageGenerator] Prompt ID received: ${this.promptId}`);
        }
        catch (error) {
            console.error("[ImageGenerator] Error during generation:", error);
            this.statusElement.textContent = "Error: " + (error instanceof Error ? error.message : String(error));
            this.stopTimer();
            this.noiseAnim.stop();
            this.showEmptyStateUI();
        }
    }
    /**
     * Poll for preview images to be ready
     */
    async pollForPreview() {
        this.isPolling = true;
        const maxAttempts = 20;
        let attempts = 0;
        const pollInterval = 1000;
        console.log(`[ImageGenerator] Starting to poll for preview images. Prompt ID: ${this.promptId}`);
        const poll = async () => {
            attempts++;
            console.log(`[ImageGenerator] Poll attempt ${attempts}/${maxAttempts}`);
            try {
                if (!this.promptId) {
                    throw new Error("No prompt ID available");
                }
                const historyUrl = `http://127.0.0.1:8000/history/${this.promptId}`;
                console.log(`[ImageGenerator] Fetching history from: ${historyUrl}`);
                const historyResponse = await fetch(historyUrl);
                if (!historyResponse.ok)
                    throw new Error("Failed to fetch history.");
                const historyData = await historyResponse.json();
                console.log("[ImageGenerator] History data received:", historyData);
                let allImages = [];
                const outputs = historyData[this.promptId]?.outputs;
                if (outputs) {
                    console.log("[ImageGenerator] Found outputs in history data");
                    for (const nodeId in outputs) {
                        const node = this.currentWorkflow[nodeId];
                        if (node && typeof node !== 'string' && node.class_type === "PreviewImage") {
                            console.log(`[ImageGenerator] Found PreviewImage node: ${nodeId}`);
                            const nodeOutput = outputs[nodeId];
                            if (nodeOutput.images && nodeOutput.images.length > 0) {
                                console.log(`[ImageGenerator] Found ${nodeOutput.images.length} images in node ${nodeId}`);
                                allImages = allImages.concat(nodeOutput.images);
                            }
                        }
                    }
                    // Remove duplicates
                    const uniqueImages = [];
                    const seen = new Set();
                    allImages.forEach((img) => {
                        const key = img.filename + "_" + img.subfolder;
                        if (!seen.has(key)) {
                            seen.add(key);
                            uniqueImages.push(img);
                        }
                    });
                    console.log(`[ImageGenerator] Found ${uniqueImages.length} unique images`);
                    if (uniqueImages.length > 0) {
                        this.statusElement.textContent = "Generation completed. Preview images available.";
                        console.log("[ImageGenerator] Generation completed successfully");
                        this.noiseAnim.stop();
                        this.generatedImages = uniqueImages;
                        await this.fetchAndDisplayImages();
                        this.showGeneratedImagesUI(); // This will also stop the timer
                        this.isPolling = false;
                        return;
                    }
                    else {
                        console.log("[ImageGenerator] No images found yet, continuing to poll");
                    }
                }
                else {
                    console.log("[ImageGenerator] No outputs found in history data yet");
                }
            }
            catch (error) {
                console.error("[ImageGenerator] Polling error:", error);
            }
            if (attempts < maxAttempts) {
                console.log(`[ImageGenerator] Will poll again in ${pollInterval}ms`);
                setTimeout(poll, pollInterval);
            }
            else {
                console.log("[ImageGenerator] Polling timeout reached");
                this.statusElement.textContent = "Timeout waiting for preview images.";
                this.stopTimer();
                this.noiseAnim.stop();
                this.isPolling = false;
                this.showEmptyStateUI();
            }
        };
        poll();
    }
    /**
     * Fetch and display all generated images
     */
    async fetchAndDisplayImages() {
        // Clear the existing grid
        this.generatedImagesGrid.innerHTML = "";
        // Fetch and display each image
        const fetchPromises = this.generatedImages.map(async (imageInfo, index) => {
            try {
                const viewUrl = `http://127.0.0.1:8000/view?filename=${encodeURIComponent(imageInfo.filename)}&subfolder=${encodeURIComponent(imageInfo.subfolder)}&type=${encodeURIComponent(imageInfo.type)}`;
                const imageResponse = await fetch(viewUrl);
                const blob = await imageResponse.blob();
                // Convert to base64
                const base64Data = await this.convertBlobToJpeg(blob);
                this.generatedImages[index].base64 = base64Data;
                return this.createImageCard(base64Data, index);
            }
            catch (err) {
                console.error("Error fetching image:", err);
                return null;
            }
        });
        // Wait for all images to load and add to grid
        const imageElements = await Promise.all(fetchPromises);
        imageElements.forEach(elem => {
            if (elem) {
                this.generatedImagesGrid.appendChild(elem);
            }
        });
    }
    /**
     * Create an image card element for the grid
     */
    createImageCard(base64Data, index) {
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
            this.showLightbox(index);
        });
        cardDiv.appendChild(imgElement);
        colDiv.appendChild(cardDiv);
        return colDiv;
    }
    /**
     * Convert a blob to a JPEG data URL with highest quality
     */
    convertBlobToJpeg(blob) {
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
}
//# sourceMappingURL=image-generator.js.map