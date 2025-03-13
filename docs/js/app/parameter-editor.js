/**
 * ParameterEditor class - Handles loading, displaying and managing user-editable parameters
 */
export class ParameterEditor {
    /**
     * Constructor for the ParameterEditor class
     * @param containerElement - The DOM element that will contain the parameter fields
     * @param progressElement - The DOM element that displays progress/status messages
     */
    constructor(containerElement, progressElement) {
        this.userEditableValues = {};
        this.editableFieldsContainer = containerElement;
        this.progressDiv = progressElement;
    }
    /**
     * Returns the current user-editable values
     */
    getUserEditableValues() {
        return this.userEditableValues;
    }
    /**
     * Load user editable parameters from the specified workflow and create form fields
     */
    async loadUserEditableParameters() {
        try {
            const response = await fetch("workflow/Win11-stylized-wallpaper/Win11-stylized-wallpaper-user-editable-parameters.json");
            if (!response.ok)
                throw new Error("Failed to load user editable parameters.");
            const paramsJson = await response.json();
            // Clear existing fields
            this.editableFieldsContainer.innerHTML = "";
            // Iterate over each node in the parameters JSON
            for (const nodeId in paramsJson) {
                if (!paramsJson.hasOwnProperty(nodeId))
                    continue;
                // Initialize storage for this node
                this.userEditableValues[nodeId] = {};
                const nodeData = paramsJson[nodeId];
                // Create a container for this node's fields
                const nodeContainer = document.createElement("div");
                nodeContainer.classList.add("mb-3");
                // Iterate over each input in the node
                for (const inputKey in nodeData.inputs) {
                    if (!nodeData.inputs.hasOwnProperty(inputKey))
                        continue;
                    const inputData = nodeData.inputs[inputKey];
                    // Create a form group
                    const formGroup = document.createElement("div");
                    formGroup.classList.add("form-group");
                    // Create a label using the input's label as primary identifier
                    const label = document.createElement("label");
                    label.textContent = inputData.label || inputKey;
                    formGroup.appendChild(label);
                    // Create input based on selectedType
                    if (inputData.selectedType === "Image") {
                        this.createImageInput(formGroup, nodeId, inputKey, inputData.label);
                    }
                    else if (inputData.selectedType === "Number") {
                        // Convert value to number
                        const numValue = typeof inputData.value === 'string' ? parseFloat(inputData.value) : inputData.value;
                        this.createNumberInput(formGroup, nodeId, inputKey, numValue);
                    }
                    else if (inputData.selectedType === "Text" || inputData.selectedType === "String") {
                        // Convert value to string
                        const strValue = inputData.value.toString();
                        this.createTextInput(formGroup, nodeId, inputKey, strValue);
                    }
                    nodeContainer.appendChild(formGroup);
                }
                this.editableFieldsContainer.appendChild(nodeContainer);
            }
        }
        catch (error) {
            console.error("Error loading parameters:", error);
            this.editableFieldsContainer.innerHTML = `<div class="alert alert-danger">Failed to load parameters: ${error instanceof Error ? error.message : String(error)}</div>`;
        }
    }
    /**
     * Create an image input with drop area and file selection
     */
    createImageInput(formGroup, nodeId, inputKey, labelText) {
        // Create a unique field ID using nodeId and a slugified version of the label
        const fieldId = `editable-${nodeId}-${this.slugify(labelText)}`;
        // Create a drop area with updated styles and structure
        const dropArea = document.createElement("div");
        dropArea.classList.add("p-3", "text-center");
        dropArea.style.cursor = "pointer";
        dropArea.style.position = "relative";
        dropArea.style.height = "350px";
        dropArea.style.maxHeight = "350px";
        dropArea.style.border = "2px dashed #ccc";
        dropArea.style.borderRadius = "20px";
        dropArea.id = `dropArea-${fieldId}`;
        // Create an instructional overlay (absolutely positioned)
        const instruction = document.createElement("div");
        instruction.style.position = "absolute";
        instruction.style.top = "0";
        instruction.style.left = "0";
        instruction.style.width = "100%";
        instruction.style.height = "100%";
        instruction.style.display = "flex";
        instruction.style.alignItems = "center";
        instruction.style.justifyContent = "center";
        instruction.style.pointerEvents = "none";
        instruction.style.color = "#888";
        instruction.textContent = "Drop an image or click to select a file.";
        dropArea.appendChild(instruction);
        // Create an img element for preview, center aligned, using object-fit to contain the image
        const previewImg = document.createElement("img");
        previewImg.style.maxWidth = "100%";
        previewImg.style.maxHeight = "100%";
        previewImg.style.display = "none";
        previewImg.style.objectFit = "contain";
        previewImg.style.position = "relative";
        previewImg.style.zIndex = "1";
        previewImg.style.margin = "0 auto";
        previewImg.id = `preview-${fieldId}`;
        dropArea.appendChild(previewImg);
        // Create a hidden file input
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = "image/*";
        fileInput.style.display = "none";
        fileInput.id = `fileInput-${fieldId}`;
        formGroup.appendChild(dropArea);
        formGroup.appendChild(fileInput);
        // Event listeners for drag and drop and click-to-upload
        dropArea.addEventListener("click", () => fileInput.click());
        dropArea.addEventListener("dragover", (e) => {
            e.preventDefault();
            dropArea.style.borderColor = "#000";
        });
        dropArea.addEventListener("dragleave", (e) => {
            e.preventDefault();
            dropArea.style.borderColor = "#ccc";
        });
        dropArea.addEventListener("drop", (e) => {
            e.preventDefault();
            dropArea.style.borderColor = "#ccc";
            if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
                this.handleEditableFile(e.dataTransfer.files[0], nodeId, inputKey, fieldId);
            }
        });
        fileInput.addEventListener("change", () => {
            if (fileInput.files && fileInput.files[0]) {
                this.handleEditableFile(fileInput.files[0], nodeId, inputKey, fieldId);
            }
        });
    }
    /**
     * Create a number input field
     */
    createNumberInput(formGroup, nodeId, inputKey, defaultValue) {
        const numberInput = document.createElement("input");
        numberInput.type = "number";
        numberInput.classList.add("form-control");
        numberInput.value = defaultValue.toString();
        numberInput.addEventListener("change", () => {
            this.userEditableValues[nodeId][inputKey] = numberInput.value;
        });
        formGroup.appendChild(numberInput);
        // Initialize with default value
        this.userEditableValues[nodeId][inputKey] = defaultValue;
    }
    /**
     * Create a text input field
     */
    createTextInput(formGroup, nodeId, inputKey, defaultValue) {
        const textarea = document.createElement("textarea");
        textarea.classList.add("form-control");
        textarea.rows = 3;
        textarea.value = defaultValue;
        textarea.addEventListener("change", () => {
            this.userEditableValues[nodeId][inputKey] = textarea.value;
        });
        formGroup.appendChild(textarea);
        // Initialize with default value
        this.userEditableValues[nodeId][inputKey] = defaultValue;
    }
    /**
     * Handle file upload for editable image fields
     */
    async handleEditableFile(file, nodeId, inputKey, fieldId) {
        const previewImg = document.getElementById(`preview-${fieldId}`);
        const fileInput = document.getElementById(`fileInput-${fieldId}`);
        const dropArea = document.getElementById(`dropArea-${fieldId}`);
        try {
            // Convert the uploaded file to JPEG
            const jpegDataUrl = await this.convertBlobToJpeg(file);
            previewImg.src = jpegDataUrl;
            previewImg.style.display = "block";
            this.progressDiv.textContent = `Uploading image for ${nodeId} - ${inputKey}...`;
            // Convert the data URL back to a blob for uploading
            const responseDataUrl = await fetch(jpegDataUrl);
            const jpegBlob = await responseDataUrl.blob();
            const jpegFormData = new FormData();
            jpegFormData.append("image", jpegBlob, "converted.jpg");
            const uploadResponse = await fetch("http://127.0.0.1:8000/upload/image", {
                method: "POST",
                body: jpegFormData
            });
            if (!uploadResponse.ok)
                throw new Error("Upload failed.");
            const data = await uploadResponse.json();
            console.log(data);
            // Save the uploaded filename
            this.userEditableValues[nodeId][inputKey] = data.name;
            this.progressDiv.textContent = "Image uploaded successfully.";
        }
        catch (error) {
            console.error("Error uploading image:", error);
            this.progressDiv.textContent = `Error uploading image: ${error instanceof Error ? error.message : String(error)}`;
        }
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
    /**
     * Helper function to slugify text for IDs
     */
    slugify(text) {
        return text.toString().toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '');
    }
    /**
     * Update the workflow JSON with user provided values
     */
    updateWorkflowWithUserValues(workflow) {
        for (const nodeId in this.userEditableValues) {
            if (this.userEditableValues.hasOwnProperty(nodeId)) {
                if (workflow[nodeId] && workflow[nodeId].inputs) {
                    for (const inputKey in this.userEditableValues[nodeId]) {
                        if (this.userEditableValues[nodeId].hasOwnProperty(inputKey)) {
                            workflow[nodeId].inputs[inputKey] = this.userEditableValues[nodeId][inputKey];
                        }
                    }
                }
            }
        }
        return workflow;
    }
}
//# sourceMappingURL=parameter-editor.js.map