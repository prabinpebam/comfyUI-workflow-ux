import { Workflow, WorkflowNode, GeneratedImageInfo } from '../shared/types.js';
import { APIClient } from './api-client.js';
import { UIStateManager } from './ui-state-manager.js';
import { LightboxManager } from './lightbox-manager.js';
import { ImageUtility } from '../shared/image-utility.js';

/**
 * ImageGenerator class - Handles the generation and display of images
 * Acts as a coordinator between specialized modules
 */
export class ImageGenerator {
  // Specialized managers for different concerns
  private uiStateManager: UIStateManager;
  private lightboxManager: LightboxManager;
  private apiClient: APIClient;
  
  // DOM elements
  private generatedImagesGrid: HTMLDivElement;
  
  // State properties
  private currentWorkflow: Workflow = {};
  private generatedImages: GeneratedImageInfo[] = [];
  private isPolling: boolean = false;
  private promptId: string | undefined;
  
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
  constructor(
    statusElement: HTMLElement,
    generatedImagesGrid: HTMLDivElement,
    noiseCanvas: HTMLCanvasElement,
    elapsedTimeElement: HTMLElement,
    generationInProgressElement: HTMLElement,
    emptyStateElement: HTMLElement,
    generatedImagesContainer: HTMLElement,
    lightboxElement: HTMLElement,
    lightboxImage: HTMLImageElement
  ) {
    // Validate required DOM elements
    if (!generatedImagesGrid) throw new Error("Generated images grid element is required");
    
    this.generatedImagesGrid = generatedImagesGrid;
    
    // Initialize managers
    this.uiStateManager = new UIStateManager(
      statusElement,
      noiseCanvas,
      elapsedTimeElement,
      generationInProgressElement,
      emptyStateElement,
      generatedImagesContainer
    );
    
    this.lightboxManager = new LightboxManager(
      lightboxElement,
      lightboxImage
    );
    
    this.apiClient = new APIClient();
  }
  
  /**
   * Generate a background image using the provided workflow
   * @param workflow - The workflow data to use for generation
   */
  async generateBackground(workflow: Workflow): Promise<void> {
    // Reset state
    this.generatedImages = [];
    
    // Show generation in progress UI
    this.uiStateManager.showGenerationInProgress();
    this.uiStateManager.updateStatus("Loading workflow...");
    
    console.log("[ImageGenerator] Starting generation process");
    
    try {
      let baseWorkflowPath = "";
      const workflowId = workflow.id as string;
      
      // Remove the id property from workflow before sending to server
      const workflowToSend = { ...workflow };
      delete workflowToSend.id;
      
      // Determine the workflow file path
      if (workflowId) {
        baseWorkflowPath = `workflow/${workflowId}/${workflowId}.json`;
      } else {
        // Default to Win11 for backwards compatibility
        baseWorkflowPath = "workflow/Win11-stylized-wallpaper/Win11-stylized-wallpaper.json";
      }
      
      console.log(`[ImageGenerator] Loading base workflow from: ${baseWorkflowPath}`);
      const workflowResponse = await fetch(baseWorkflowPath);
      if (!workflowResponse.ok) throw new Error("Failed to load workflow JSON.");
      const baseWorkflow = await workflowResponse.json() as Workflow;
      
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
                    this.currentWorkflow[nodeId] = { class_type: '', inputs: {} } as WorkflowNode;
                  } else if (typeof this.currentWorkflow[nodeId] === 'object' && !this.currentWorkflow[nodeId].inputs) {
                    (this.currentWorkflow[nodeId] as WorkflowNode).inputs = {};
                  }
                  
                  // Set the parameter value
                  if (typeof this.currentWorkflow[nodeId] === 'object') {
                    (this.currentWorkflow[nodeId] as WorkflowNode).inputs[inputKey] = value;
                    console.log(`[ImageGenerator] Updated parameter: ${nodeId}.${inputKey} = ${JSON.stringify(value)}`);
                  }
                }
              }
            }
          }
        }
      }
  
      this.uiStateManager.updateStatus("Workflow loaded and parameters applied. Starting image generation...");
      console.log("[ImageGenerator] Workflow loaded and user parameters applied");
      
      // Track preview nodes for completion tracking
      let previewNodesCount = 0;
      let previewNodesExecuted = 0;
      
      // Find PreviewImage nodes to track overall completion
      for (const nodeId in this.currentWorkflow) {
        if (
          this.currentWorkflow[nodeId] && 
          typeof this.currentWorkflow[nodeId] !== 'string' && 
          (this.currentWorkflow[nodeId] as WorkflowNode).class_type === "PreviewImage"
        ) {
          previewNodesCount++;
        }
      }
      
      // Send workflow to server with WebSocket handlers for progress updates
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
            
            // Only consider workflow complete when all preview nodes are executed
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
    } catch (error) {
      console.error("[ImageGenerator] Error during generation:", error);
      this.uiStateManager.updateStatus("Error: " + (error instanceof Error ? error.message : String(error)));
      this.uiStateManager.showEmptyState();
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

    console.log(`[ImageGenerator] Starting to poll for preview images. Prompt ID: ${this.promptId}`);
    
    const poll = async () => {
      attempts++;
      console.log(`[ImageGenerator] Poll attempt ${attempts}/${maxAttempts}`);
      
      try {
        if (!this.promptId) {
          throw new Error("No prompt ID available");
        }
        
        // Fetch history data
        const historyData = await this.apiClient.getHistory(this.promptId);
        
        // Extract image information
        const images = this.apiClient.extractGeneratedImagesInfo(historyData, this.currentWorkflow);
        
        if (images.length > 0) {
          this.uiStateManager.updateStatus("Generation completed. Preview images available.");
          console.log("[ImageGenerator] Generation completed successfully");
          
          // Fetch actual image data and update the UI
          this.generatedImages = await ImageUtility.fetchAllImages(images);
          await this.displayImages();
          
          this.uiStateManager.showGeneratedImages();
          this.isPolling = false;
          return;
        } else {
          console.log("[ImageGenerator] No images found yet, continuing to poll");
        }
      } catch (error) {
        console.error("[ImageGenerator] Polling error:", error);
      }
      
      if (attempts < maxAttempts) {
        console.log(`[ImageGenerator] Will poll again in ${pollInterval}ms`);
        setTimeout(poll, pollInterval);
      } else {
        console.log("[ImageGenerator] Polling timeout reached");
        this.uiStateManager.updateStatus("Timeout waiting for preview images.");
        this.uiStateManager.showEmptyState();
        this.isPolling = false;
      }
    };
    
    poll();
  }
  
  /**
   * Display generated images in the grid
   */
  private async displayImages(): Promise<void> {
    // Clear the existing grid
    this.generatedImagesGrid.innerHTML = "";
    
    // Update the lightbox with the current images
    this.lightboxManager.setImages(this.generatedImages);
    
    // Add each image to the grid
    this.generatedImages.forEach((imageInfo, index) => {
      if (imageInfo.base64) {
        const imageCard = ImageUtility.createImageCard(
          imageInfo.base64,
          index,
          (idx) => this.lightboxManager.show(idx)
        );
        
        this.generatedImagesGrid.appendChild(imageCard);
      }
    });
  }
}