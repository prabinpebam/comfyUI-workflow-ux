import { Workflow, WorkflowNode, GeneratedImageInfo } from '../shared/types';

/**
 * Interface for WebSocket message handlers
 */
interface WebSocketHandlers {
  onProgress?: (value: number, max: number) => void;
  onExecuting?: (node: string) => void;
  onExecuted?: (node: string) => void;
  onCached?: (data: any) => void;
  onError?: (error: Error) => void;
  onClose?: () => void;
}

/**
 * APIClient class - Handles all communication with the ComfyUI server
 */
export class APIClient {
  private readonly SERVER_URL: string = 'http://127.0.0.1:8000';
  private readonly WS_URL: string = 'ws://127.0.0.1:8000/ws';
  
  private clientId: string;
  private webSocket: WebSocket | null = null;
  private promptId: string | null = null;

  constructor() {
    // Generate a unique client ID for this session
    this.clientId = (crypto.randomUUID)
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2);
    
    console.log(`[APIClient] Generated client ID: ${this.clientId}`);
  }
  
  /**
   * Send a workflow to the ComfyUI server for processing
   * @param workflow - The workflow data to send
   * @param handlers - Callback handlers for WebSocket events
   * @returns The prompt ID if successful, throws an error otherwise
   */
  async sendWorkflow(workflow: Workflow, handlers: WebSocketHandlers): Promise<string> {
    console.log("[APIClient] Starting generation process with workflow:", workflow);
    
    // Connect to WebSocket for progress updates
    this.connectWebSocket(handlers);
    
    try {
      // Send the workflow to the server
      const promptPayload = {
        prompt: workflow,
        client_id: this.clientId
      };
      
      console.log("[APIClient] Sending prompt payload:", promptPayload);
      const response = await fetch(`${this.SERVER_URL}/prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(promptPayload)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${errorText}`);
      }
      
      const data = await response.json();
      this.promptId = data.prompt_id;
      console.log(`[APIClient] Prompt ID received: ${this.promptId}`);
      
      // Ensure we return a string (not null)
      if (!this.promptId) {
        throw new Error("No prompt ID received from server");
      }
      
      return this.promptId;
    } catch (error) {
      console.error("[APIClient] Error sending workflow:", error);
      if (this.webSocket) {
        this.webSocket.close();
      }
      throw error;
    }
  }
  
  /**
   * Connect to the ComfyUI WebSocket server for progress updates
   * @param handlers - Callback handlers for WebSocket events
   */
  private connectWebSocket(handlers: WebSocketHandlers): void {
    try {
      const wsUrl = `${this.WS_URL}?clientId=${this.clientId}`;
      console.log(`[APIClient] Opening WebSocket connection to: ${wsUrl}`);
      
      this.webSocket = new WebSocket(wsUrl);
      
      // Set up event handlers
      this.webSocket.onopen = () => {
        console.log("[WebSocket] Connection established");
      };
      
      this.webSocket.onerror = (error) => {
        console.error("[WebSocket] Connection error:", error);
        if (handlers.onError) {
          handlers.onError(new Error("WebSocket connection error"));
        }
      };
      
      this.webSocket.onclose = (event) => {
        console.log(`[WebSocket] Connection closed. Code: ${event.code}, Reason: ${event.reason}`);
        if (handlers.onClose) {
          handlers.onClose();
        }
      };
      
      this.webSocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log("[WebSocket] Received message:", message);
          
          switch (message.type) {
            case "progress":
              if (handlers.onProgress && message.data) {
                handlers.onProgress(message.data.value, message.data.max);
              }
              break;
            case "executing":
              if (handlers.onExecuting && message.data) {
                handlers.onExecuting(message.data.node);
              }
              break;
            case "executed":
              if (handlers.onExecuted && message.data) {
                handlers.onExecuted(message.data.node);
              }
              break;
            case "execution_cached":
              if (handlers.onCached && message.data) {
                handlers.onCached(message.data);
              }
              break;
            default:
              console.log(`[WebSocket] Unhandled message type: ${message.type}`);
          }
        } catch (error) {
          console.error("[WebSocket] Error processing message:", error);
        }
      };
    } catch (error) {
      console.error("[APIClient] Error setting up WebSocket:", error);
      if (handlers.onError) {
        handlers.onError(error instanceof Error ? error : new Error(String(error)));
      }
    }
  }
  
  /**
   * Get the history data for a completed prompt
   * @param promptId - The ID of the prompt to get history for
   */
  async getHistory(promptId: string): Promise<any> {
    try {
      const historyUrl = `${this.SERVER_URL}/history/${promptId}`;
      console.log(`[APIClient] Fetching history from: ${historyUrl}`);
      
      const historyResponse = await fetch(historyUrl);
      if (!historyResponse.ok) {
        throw new Error("Failed to fetch history.");
      }
      
      const historyData = await historyResponse.json();
      console.log("[APIClient] History data received:", historyData);
      
      return historyData;
    } catch (error) {
      console.error("[APIClient] Error fetching history:", error);
      throw error;
    }
  }
  
  /**
   * Extract all generated images from history data
   * @param historyData - The history data from the server
   * @param workflow - The current workflow with node information
   */
  extractGeneratedImagesInfo(historyData: any, workflow: Workflow): GeneratedImageInfo[] {
    let allImages: GeneratedImageInfo[] = [];
    
    if (!this.promptId || !historyData[this.promptId]?.outputs) {
      return allImages;
    }
    
    const outputs = historyData[this.promptId].outputs;
    
    // Find all "PreviewImage" nodes in the outputs
    for (const nodeId in outputs) {
      const node = workflow[nodeId];
      if (node && typeof node !== 'string' && (node as WorkflowNode).class_type === "PreviewImage") {
        console.log(`[APIClient] Found PreviewImage node: ${nodeId}`);
        
        const nodeOutput = outputs[nodeId] as { images?: Array<GeneratedImageInfo> };
        if (nodeOutput.images && nodeOutput.images.length > 0) {
          console.log(`[APIClient] Found ${nodeOutput.images.length} images in node ${nodeId}`);
          allImages = allImages.concat(nodeOutput.images);
        }
      }
    }
    
    // Remove duplicates
    const uniqueImages: GeneratedImageInfo[] = [];
    const seen = new Set();
    allImages.forEach((img) => {
      const key = img.filename + "_" + img.subfolder;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueImages.push(img);
      }
    });
    
    console.log(`[APIClient] Found ${uniqueImages.length} unique images`);
    return uniqueImages;
  }
  
  /**
   * Fetch image data from the server
   * @param imageInfo - The image info object
   */
  async fetchImageData(imageInfo: GeneratedImageInfo): Promise<string> {
    try {
      const viewUrl = `${this.SERVER_URL}/view?filename=${encodeURIComponent(imageInfo.filename)}&subfolder=${encodeURIComponent(imageInfo.subfolder)}&type=${encodeURIComponent(imageInfo.type)}`;
      
      const imageResponse = await fetch(viewUrl);
      const blob = await imageResponse.blob();
      
      // Convert to base64 data URL
      return this.convertBlobToDataURL(blob);
    } catch (error) {
      console.error("[APIClient] Error fetching image:", error);
      throw error;
    }
  }
  
  /**
   * Convert a blob to a JPEG data URL
   * @param blob - The image blob to convert
   */
  private async convertBlobToDataURL(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  
  /**
   * Clean up this client instance
   */
  cleanup(): void {
    if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
      this.webSocket.close();
    }
  }
}