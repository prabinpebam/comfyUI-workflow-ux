export class APIClient {
    constructor() {
        this.SERVER_URL = 'http://127.0.0.1:8000';
        this.WS_URL = 'ws://127.0.0.1:8000/ws';
        this.webSocket = null;
        this.promptId = null;
        this.clientId = (crypto.randomUUID)
            ? crypto.randomUUID()
            : Math.random().toString(36).substring(2);
        console.log(`[APIClient] Generated client ID: ${this.clientId}`);
    }
    async sendWorkflow(workflow, handlers) {
        console.log("[APIClient] Starting generation process with workflow:", workflow);
        this.connectWebSocket(handlers);
        try {
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
            if (!this.promptId) {
                throw new Error("No prompt ID received from server");
            }
            return this.promptId;
        }
        catch (error) {
            console.error("[APIClient] Error sending workflow:", error);
            if (this.webSocket) {
                this.webSocket.close();
            }
            throw error;
        }
    }
    connectWebSocket(handlers) {
        try {
            const wsUrl = `${this.WS_URL}?clientId=${this.clientId}`;
            console.log(`[APIClient] Opening WebSocket connection to: ${wsUrl}`);
            this.webSocket = new WebSocket(wsUrl);
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
                }
                catch (error) {
                    console.error("[WebSocket] Error processing message:", error);
                }
            };
        }
        catch (error) {
            console.error("[APIClient] Error setting up WebSocket:", error);
            if (handlers.onError) {
                handlers.onError(error instanceof Error ? error : new Error(String(error)));
            }
        }
    }
    async getHistory(promptId) {
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
        }
        catch (error) {
            console.error("[APIClient] Error fetching history:", error);
            throw error;
        }
    }
    extractGeneratedImagesInfo(historyData, workflow) {
        var _a;
        let allImages = [];
        if (!this.promptId || !((_a = historyData[this.promptId]) === null || _a === void 0 ? void 0 : _a.outputs)) {
            return allImages;
        }
        const outputs = historyData[this.promptId].outputs;
        for (const nodeId in outputs) {
            const node = workflow[nodeId];
            if (node && typeof node !== 'string' && node.class_type === "PreviewImage") {
                console.log(`[APIClient] Found PreviewImage node: ${nodeId}`);
                const nodeOutput = outputs[nodeId];
                if (nodeOutput.images && nodeOutput.images.length > 0) {
                    console.log(`[APIClient] Found ${nodeOutput.images.length} images in node ${nodeId}`);
                    allImages = allImages.concat(nodeOutput.images);
                }
            }
        }
        const uniqueImages = [];
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
    async fetchImageData(imageInfo) {
        try {
            const viewUrl = `${this.SERVER_URL}/view?filename=${encodeURIComponent(imageInfo.filename)}&subfolder=${encodeURIComponent(imageInfo.subfolder)}&type=${encodeURIComponent(imageInfo.type)}`;
            const imageResponse = await fetch(viewUrl);
            const blob = await imageResponse.blob();
            return this.convertBlobToDataURL(blob);
        }
        catch (error) {
            console.error("[APIClient] Error fetching image:", error);
            throw error;
        }
    }
    async convertBlobToDataURL(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
    cleanup() {
        if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
            this.webSocket.close();
        }
    }
}
