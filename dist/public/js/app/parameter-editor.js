export class ParameterEditor {
    constructor(containerElement, statusElement, generateButton) {
        this.userEditableValues = {};
        this.currentWorkflowId = null;
        this.currentWorkflowPath = null;
        this.editableFieldsContainer = containerElement;
        this.statusElement = statusElement;
        this.generateButton = generateButton;
    }
    getUserEditableValues() {
        return this.userEditableValues;
    }
    async setWorkflow(workflowId, workflowTitle, workflowPath) {
        this.currentWorkflowId = workflowId;
        this.currentWorkflowPath = workflowPath;
        this.updateWorkflowTitle(workflowTitle);
        this.generateButton.disabled = false;
        await this.loadUserEditableParameters();
    }
    updateWorkflowTitle(title) {
        const titleElement = document.getElementById("workflowTitle");
        if (titleElement) {
            titleElement.textContent = title;
        }
    }
    async loadUserEditableParameters() {
        this.userEditableValues = {};
        try {
            if (!this.currentWorkflowId || !this.currentWorkflowPath) {
                throw new Error("No workflow selected");
            }
            const response = await fetch(`workflow/${this.currentWorkflowPath}/${this.currentWorkflowPath}-user-editable-parameters.json`, {
                headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache', 'Expires': '0' },
                cache: 'no-store'
            });
            if (!response.ok)
                throw new Error("Failed to load user editable parameters.");
            const paramsJson = await response.json();
            if (paramsJson.workflowDetails && paramsJson.workflowDetails.title) {
                const workflowTitle = String(paramsJson.workflowDetails.title);
                this.updateWorkflowTitle(workflowTitle);
            }
            this.editableFieldsContainer.innerHTML = "";
            for (const nodeId in paramsJson) {
                if (nodeId === "workflowDetails")
                    continue;
                if (!paramsJson.hasOwnProperty(nodeId))
                    continue;
                this.userEditableValues[nodeId] = {};
                const nodeData = paramsJson[nodeId];
                const nodeContainer = document.createElement("div");
                nodeContainer.classList.add("card", "mb-4");
                if (nodeData.title) {
                    const nodeHeader = document.createElement("div");
                    nodeHeader.classList.add("card-header");
                    nodeHeader.textContent = nodeData.title;
                    nodeContainer.appendChild(nodeHeader);
                }
                const nodeBodyContainer = document.createElement("div");
                nodeBodyContainer.classList.add("card-body");
                for (const inputKey in nodeData.inputs) {
                    if (!nodeData.inputs.hasOwnProperty(inputKey))
                        continue;
                    const inputData = nodeData.inputs[inputKey];
                    const formGroup = document.createElement("div");
                    formGroup.classList.add("form-group", "mb-4");
                    const label = document.createElement("label");
                    label.classList.add("form-label", "fw-bold", "mb-2");
                    label.textContent = inputData.label || inputKey;
                    formGroup.appendChild(label);
                    if (inputData.selectedType === "Image") {
                        this.createImageInput(formGroup, nodeId, inputKey, inputData.label);
                    }
                    else if (inputData.selectedType === "Number") {
                        const numValue = typeof inputData.value === 'string' ? parseFloat(inputData.value) : inputData.value;
                        this.createNumberInput(formGroup, nodeId, inputKey, numValue);
                    }
                    else if (inputData.selectedType === "Text" || inputData.selectedType === "String") {
                        const strValue = inputData.value.toString();
                        this.createTextInput(formGroup, nodeId, inputKey, strValue);
                    }
                    nodeBodyContainer.appendChild(formGroup);
                }
                nodeContainer.appendChild(nodeBodyContainer);
                this.editableFieldsContainer.appendChild(nodeContainer);
            }
        }
        catch (error) {
            console.error("Error loading parameters:", error);
            this.editableFieldsContainer.innerHTML = `<div class="alert alert-danger">Failed to load parameters: ${error instanceof Error ? error.message : String(error)}</div>`;
            this.generateButton.disabled = true;
        }
    }
    createImageInput(formGroup, nodeId, inputKey, labelText) {
        const fieldId = `editable-${nodeId}-${this.slugify(labelText)}`;
        const dropArea = document.createElement("div");
        dropArea.classList.add("image-upload-area", "d-flex", "flex-column", "align-items-center", "justify-content-center");
        dropArea.id = `dropArea-${fieldId}`;
        const instruction = document.createElement("div");
        instruction.classList.add("text-secondary", "mb-2");
        instruction.textContent = "Drop an image or click to select a file.";
        dropArea.appendChild(instruction);
        const iconDiv = document.createElement("div");
        iconDiv.classList.add("text-secondary", "mb-3");
        iconDiv.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" class="bi bi-cloud-arrow-up" viewBox="0 0 16 16">
      <path fill-rule="evenodd" d="M7.646 5.146a.5.5 0 0 1 .708 0l2 2a.5.5 0 0 1-.708.708L8.5 6.707V10.5a.5.5 0 0 1-1 0V6.707L6.354 7.854a.5.5 0 1 1-.708-.708l2-2z"/>
      <path d="M4.406 3.342A5.53 5.53 0 0 1 8 2c2.69 0 4.923 2 5.166 4.579C14.758 6.804 16 8.137 16 9.773 16 11.569 14.502 13 12.687 13H3.781C1.708 13 0 11.366 0 9.318c0-1.763 1.266-3.223 2.942-3.593.143-.863.698-1.723 1.464-2.383zm.653.757c-.757.653-1.153 1.44-1.153 2.056v.448l-.445.049C2.064 6.805 1 7.952 1 9.318 1 10.785 2.23 12 3.781 12h8.906C13.98 12 15 10.988 15 9.773c0-1.216-1.02-2.228-2.313-2.228h-.5v-.5C12.188 4.825 10.328 3 8 3a4.53 4.53 0 0 0-2.941 1.1z"/>
    </svg>`;
        dropArea.appendChild(iconDiv);
        const previewImg = document.createElement("img");
        previewImg.style.display = "none";
        previewImg.id = `preview-${fieldId}`;
        dropArea.appendChild(previewImg);
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = "image/*";
        fileInput.style.display = "none";
        fileInput.id = `fileInput-${fieldId}`;
        formGroup.appendChild(dropArea);
        formGroup.appendChild(fileInput);
        const uploadStatus = document.createElement("div");
        uploadStatus.classList.add("upload-status", "mt-2", "small");
        uploadStatus.id = `status-${fieldId}`;
        formGroup.appendChild(uploadStatus);
        dropArea.addEventListener("click", () => fileInput.click());
        dropArea.addEventListener("dragover", (e) => {
            e.preventDefault();
            dropArea.style.borderColor = "var(--bs-primary)";
            dropArea.classList.add("border-primary");
        });
        dropArea.addEventListener("dragleave", (e) => {
            e.preventDefault();
            dropArea.style.borderColor = "#ccc";
            dropArea.classList.remove("border-primary");
        });
        dropArea.addEventListener("drop", (e) => {
            var _a;
            e.preventDefault();
            dropArea.style.borderColor = "#ccc";
            dropArea.classList.remove("border-primary");
            if (((_a = e.dataTransfer) === null || _a === void 0 ? void 0 : _a.files) && e.dataTransfer.files.length > 0) {
                this.handleEditableFile(e.dataTransfer.files[0], nodeId, inputKey, fieldId);
            }
        });
        fileInput.addEventListener("change", () => {
            if (fileInput.files && fileInput.files[0]) {
                this.handleEditableFile(fileInput.files[0], nodeId, inputKey, fieldId);
            }
        });
    }
    createNumberInput(formGroup, nodeId, inputKey, defaultValue) {
        const numberInput = document.createElement("input");
        numberInput.type = "number";
        numberInput.classList.add("form-control");
        numberInput.value = defaultValue.toString();
        numberInput.addEventListener("change", () => {
            this.userEditableValues[nodeId][inputKey] = parseFloat(numberInput.value);
        });
        formGroup.appendChild(numberInput);
        this.userEditableValues[nodeId][inputKey] = defaultValue;
    }
    createTextInput(formGroup, nodeId, inputKey, defaultValue) {
        const textarea = document.createElement("textarea");
        textarea.classList.add("form-control");
        textarea.rows = 3;
        textarea.value = defaultValue;
        textarea.addEventListener("change", () => {
            this.userEditableValues[nodeId][inputKey] = textarea.value;
        });
        formGroup.appendChild(textarea);
        this.userEditableValues[nodeId][inputKey] = defaultValue;
    }
    async handleEditableFile(file, nodeId, inputKey, fieldId) {
        var _a;
        const previewImg = document.getElementById(`preview-${fieldId}`);
        const fileInput = document.getElementById(`fileInput-${fieldId}`);
        const dropArea = document.getElementById(`dropArea-${fieldId}`);
        const uploadStatus = document.getElementById(`status-${fieldId}`);
        const instructionEl = dropArea.querySelector(".text-secondary");
        const iconEl = (_a = dropArea.querySelector("svg")) === null || _a === void 0 ? void 0 : _a.parentElement;
        try {
            if (uploadStatus) {
                uploadStatus.innerHTML = `
          <div class="spinner-border spinner-border-sm text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          <span class="ms-2">Uploading image for ${inputKey}...</span>
        `;
            }
            this.statusElement.textContent = `Uploading image for ${inputKey}...`;
            const jpegDataUrl = await this.convertBlobToJpeg(file);
            previewImg.src = jpegDataUrl;
            previewImg.style.display = "block";
            if (instructionEl instanceof HTMLElement)
                instructionEl.style.display = "none";
            if (iconEl instanceof HTMLElement)
                iconEl.style.display = "none";
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
            this.userEditableValues[nodeId][inputKey] = data.name;
            this.statusElement.textContent = "Image uploaded successfully.";
            if (uploadStatus) {
                uploadStatus.innerHTML = `
          <div class="text-success">
            <i class="bi bi-check-circle-fill me-1"></i>
            Image uploaded successfully (${data.name})
          </div>
        `;
            }
        }
        catch (error) {
            this.statusElement.textContent = `Error uploading image: ${error instanceof Error ? error.message : String(error)}`;
            if (uploadStatus) {
                uploadStatus.innerHTML = `
          <div class="text-danger">
            <i class="bi bi-exclamation-triangle-fill me-1"></i>
            Upload failed: ${error instanceof Error ? error.message : String(error)}
          </div>
        `;
            }
            previewImg.style.display = "none";
            if (instructionEl instanceof HTMLElement)
                instructionEl.style.display = "block";
            if (iconEl instanceof HTMLElement)
                iconEl.style.display = "block";
        }
    }
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
                const jpegDataUrl = canvas.toDataURL("image/jpeg", 1.0);
                resolve(jpegDataUrl);
            };
            img.onerror = reject;
            img.src = URL.createObjectURL(blob);
        });
    }
    slugify(text) {
        return text.toString().toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '');
    }
    updateWorkflowWithUserValues(workflow) {
        for (const nodeId in this.userEditableValues) {
            if (this.userEditableValues.hasOwnProperty(nodeId)) {
                if (!workflow[nodeId]) {
                    workflow[nodeId] = { inputs: {} };
                }
                if (!workflow[nodeId].inputs) {
                    workflow[nodeId].inputs = {};
                }
                for (const inputKey in this.userEditableValues[nodeId]) {
                    if (this.userEditableValues[nodeId].hasOwnProperty(inputKey)) {
                        workflow[nodeId].inputs[inputKey] = this.userEditableValues[nodeId][inputKey];
                    }
                }
            }
        }
        return workflow;
    }
}
