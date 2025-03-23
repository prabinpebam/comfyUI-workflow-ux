import { APIClient } from './api-client.js';
import { UIStateManager } from './ui-state-manager.js';
import { LightboxManager } from './lightbox-manager.js';
import { ImageUtility } from '../shared/image-utility.js';
export class ImageGenerator {
    constructor(statusElement, generatedImagesGrid, noiseCanvas, elapsedTimeElement, generationInProgressElement, emptyStateElement, generatedImagesContainer, lightboxElement, lightboxImage) {
        this.currentWorkflow = {};
        this.generatedImages = [];
        this.isPolling = false;
        if (!generatedImagesGrid)
            throw new Error("Generated images grid element is required");
        this.generatedImagesGrid = generatedImagesGrid;
        this.uiStateManager = new UIStateManager(statusElement, noiseCanvas, elapsedTimeElement, generationInProgressElement, emptyStateElement, generatedImagesContainer);
        this.lightboxManager = new LightboxManager(lightboxElement, lightboxImage);
        this.apiClient = new APIClient();
    }
    async generateBackground(workflow) {
        this.generatedImages = [];
        this.uiStateManager.showGenerationInProgress();
        this.uiStateManager.updateStatus("Loading workflow...");
        console.log("[ImageGenerator] Starting generation process");
        try {
            const workflowId = workflow.id;
            const workflowPath = workflow.path;
            const workflowToSend = { ...workflow };
            delete workflowToSend.id;
            delete workflowToSend.path;
            const baseWorkflowPath = workflowPath
                ? `workflow/${workflowPath}/${workflowPath}.json`
                : "workflow/Win11-stylized-wallpaper/Win11-stylized-wallpaper.json";
            console.log(`[ImageGenerator] Loading base workflow from: ${baseWorkflowPath}`);
            const workflowResponse = await fetch(baseWorkflowPath);
            if (!workflowResponse.ok)
                throw new Error("Failed to load workflow JSON.");
            const baseWorkflow = await workflowResponse.json();
            this.currentWorkflow = { ...baseWorkflow };
            for (const nodeId in workflowToSend) {
                if (nodeId !== 'id' && workflowToSend.hasOwnProperty(nodeId)) {
                    const node = workflowToSend[nodeId];
                    if (this.currentWorkflow[nodeId] && typeof this.currentWorkflow[nodeId] !== 'string') {
                        if (typeof node === 'object' && node.inputs) {
                            for (const inputKey in node.inputs) {
                                if (node.inputs.hasOwnProperty(inputKey)) {
                                    const value = node.inputs[inputKey];
                                    if (!this.currentWorkflow[nodeId]) {
                                        this.currentWorkflow[nodeId] = { class_type: '', inputs: {} };
                                    }
                                    else if (typeof this.currentWorkflow[nodeId] === 'object' && !this.currentWorkflow[nodeId].inputs) {
                                        this.currentWorkflow[nodeId].inputs = {};
                                    }
                                    this.currentWorkflow[nodeId].inputs[inputKey] = value;
                                    console.log(`[ImageGenerator] Updated parameter: ${nodeId}.${inputKey} = ${JSON.stringify(value)}`);
                                }
                            }
                        }
                    }
                }
            }
            this.uiStateManager.updateStatus("Workflow loaded and parameters applied. Starting image generation...");
            console.log("[ImageGenerator] Workflow loaded and user parameters applied");
            let previewNodesCount = 0;
            let previewNodesExecuted = 0;
            for (const nodeId in this.currentWorkflow) {
                if (this.currentWorkflow[nodeId] &&
                    typeof this.currentWorkflow[nodeId] !== 'string' &&
                    this.currentWorkflow[nodeId].class_type === "PreviewImage") {
                    previewNodesCount++;
                }
            }
            this.promptId = await this.apiClient.sendWorkflow(this.currentWorkflow, {
                onProgress: (value, max) => {
                    this.uiStateManager.updateStatus(`Progress: ${value} / ${max}`);
                },
                onExecuting: (node) => {
                    this.uiStateManager.updateStatus(`Executing node: ${node}`);
                },
                onExecuted: (node) => {
                    const nodeObj = this.currentWorkflow[node];
                    if (nodeObj && typeof nodeObj !== 'string' && nodeObj.class_type === "PreviewImage") {
                        previewNodesExecuted++;
                        this.uiStateManager.updateStatus(`Preview node (${node}) executed. (${previewNodesExecuted}/${previewNodesCount})`);
                        if (previewNodesExecuted >= previewNodesCount) {
                            if (!this.isPolling) {
                                this.pollForPreview();
                            }
                        }
                    }
                },
                onCached: (data) => {
                    this.uiStateManager.updateStatus(`Cached execution: ${JSON.stringify(data)}`);
                },
                onError: (error) => {
                    this.uiStateManager.updateStatus(`WebSocket error: ${error.message}`);
                }
            });
        }
        catch (error) {
            console.error("[ImageGenerator] Error during generation:", error);
            this.uiStateManager.updateStatus("Error: " + (error instanceof Error ? error.message : String(error)));
            this.uiStateManager.showEmptyState();
        }
    }
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
                const historyData = await this.apiClient.getHistory(this.promptId);
                const images = this.apiClient.extractGeneratedImagesInfo(historyData, this.currentWorkflow);
                if (images.length > 0) {
                    this.uiStateManager.updateStatus("Generation completed. Preview images available.");
                    console.log("[ImageGenerator] Generation completed successfully");
                    this.generatedImages = await ImageUtility.fetchAllImages(images);
                    await this.displayImages();
                    this.uiStateManager.showGeneratedImages();
                    this.isPolling = false;
                    return;
                }
                else {
                    console.log("[ImageGenerator] No images found yet, continuing to poll");
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
                this.uiStateManager.updateStatus("Timeout waiting for preview images.");
                this.uiStateManager.showEmptyState();
                this.isPolling = false;
            }
        };
        poll();
    }
    async displayImages() {
        this.generatedImagesGrid.innerHTML = "";
        this.lightboxManager.setImages(this.generatedImages);
        this.generatedImages.forEach((imageInfo, index) => {
            if (imageInfo.base64) {
                const imageCard = ImageUtility.createImageCard(imageInfo.base64, index, (idx) => this.lightboxManager.show(idx));
                this.generatedImagesGrid.appendChild(imageCard);
            }
        });
    }
}
