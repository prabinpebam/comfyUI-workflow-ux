import { UserEditableParameters } from '../shared/types';

/**
 * ParameterEditor class - Handles loading, displaying and managing user-editable parameters
 */
export class ParameterEditor {
  private editableFieldsContainer: HTMLDivElement;
  private userEditableValues: Record<string, Record<string, any>> = {};
  private statusElement: HTMLElement;
  private currentWorkflowId: string | null = null;
  private currentWorkflowPath: string | null = null;
  private generateButton: HTMLButtonElement;
  
  /**
   * Constructor for the ParameterEditor class
   * @param containerElement - The DOM element that will contain the parameter fields
   * @param statusElement - The DOM element that displays progress/status messages
   * @param generateButton - The button that initiates generation
   */
  constructor(
    containerElement: HTMLDivElement, 
    statusElement: HTMLElement,
    generateButton: HTMLButtonElement
  ) {
    this.editableFieldsContainer = containerElement;
    this.statusElement = statusElement;
    this.generateButton = generateButton;
  }
  
  /**
   * Returns the current user-editable values
   */
  getUserEditableValues(): Record<string, Record<string, any>> {
    return this.userEditableValues;
  }

  /**
   * Set the workflow to edit parameters for
   * @param workflowId - The ID of the workflow to load
   * @param workflowTitle - The title to display for the workflow
   * @param workflowPath - The path where the workflow files are stored
   */
  async setWorkflow(workflowId: string, workflowTitle: string, workflowPath: string): Promise<void> {
    this.currentWorkflowId = workflowId;
    this.currentWorkflowPath = workflowPath;
    
    // Set the title in the UI
    this.updateWorkflowTitle(workflowTitle);
    
    // Enable the generate button
    this.generateButton.disabled = false;
    
    // Load the parameters for this workflow
    await this.loadUserEditableParameters();
  }
  
  /**
   * Update the workflow title in the UI
   * @param title - The title to display
   */
  private updateWorkflowTitle(title: string): void {
    const titleElement = document.getElementById("workflowTitle");
    if (titleElement) {
      titleElement.textContent = title;
    }
  }

  /**
   * Load user editable parameters for the current workflow
   */
  private async loadUserEditableParameters(): Promise<void> {
    // Reset previous values
    this.userEditableValues = {};
    
    try {
      if (!this.currentWorkflowId || !this.currentWorkflowPath) {
        throw new Error("No workflow selected");
      }
      
      const response = await fetch(`workflow/${this.currentWorkflowPath}/${this.currentWorkflowPath}-user-editable-parameters.json`, {
        // Add cache busting to ensure we're getting the latest version of the file
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache', 'Expires': '0' },
        cache: 'no-store'
      });
      if (!response.ok) throw new Error("Failed to load user editable parameters.");
      
      const paramsJson = await response.json() as UserEditableParameters;
      
      // Always update the title from the latest data in the JSON file
      if (paramsJson.workflowDetails && paramsJson.workflowDetails.title) {
        const workflowTitle = String(paramsJson.workflowDetails.title);
        this.updateWorkflowTitle(workflowTitle);
      }
      
      // Clear existing fields
      this.editableFieldsContainer.innerHTML = "";
      
      // Iterate over each node in the parameters JSON
      for (const nodeId in paramsJson) {
        // Skip the workflowDetails node as it's not a parameter for users to edit
        if (nodeId === "workflowDetails") continue;
        
        if (!paramsJson.hasOwnProperty(nodeId)) continue;
        
        // Initialize storage for this node
        this.userEditableValues[nodeId] = {};
        const nodeData = paramsJson[nodeId];
        
        // Create a container for this node's fields with Bootstrap card styling
        const nodeContainer = document.createElement("div");
        nodeContainer.classList.add("card", "mb-4");
        
        // Add a header for the node if the node has a title
        if (nodeData.title) {
          const nodeHeader = document.createElement("div");
          nodeHeader.classList.add("card-header");
          nodeHeader.textContent = nodeData.title;
          nodeContainer.appendChild(nodeHeader);
        }
        
        // Create card body for the form elements
        const nodeBodyContainer = document.createElement("div");
        nodeBodyContainer.classList.add("card-body");
        
        // Iterate over each input in the node
        for (const inputKey in nodeData.inputs) {
          if (!nodeData.inputs.hasOwnProperty(inputKey)) continue;
          
          const inputData = nodeData.inputs[inputKey];
          
          // Create a form group with margins
          const formGroup = document.createElement("div");
          formGroup.classList.add("form-group", "mb-4");
          
          // Create a label using the input's label as primary identifier
          const label = document.createElement("label");
          label.classList.add("form-label", "fw-bold", "mb-2");
          label.textContent = inputData.label || inputKey;
          formGroup.appendChild(label);
          
          // Create input based on selectedType
          if (inputData.selectedType === "Image") {
            this.createImageInput(formGroup, nodeId, inputKey, inputData.label);
          } else if (inputData.selectedType === "Number") {
            // Convert value to number
            const numValue = typeof inputData.value === 'string' ? parseFloat(inputData.value) : inputData.value;
            this.createNumberInput(formGroup, nodeId, inputKey, numValue);
          } else if (inputData.selectedType === "Text" || inputData.selectedType === "String") {
            // Convert value to string
            const strValue = inputData.value.toString();
            this.createTextInput(formGroup, nodeId, inputKey, strValue);
          }
          
          nodeBodyContainer.appendChild(formGroup);
        }
        
        nodeContainer.appendChild(nodeBodyContainer);
        this.editableFieldsContainer.appendChild(nodeContainer);
      }
    } catch (error) {
      console.error("Error loading parameters:", error);
      this.editableFieldsContainer.innerHTML = `<div class="alert alert-danger">Failed to load parameters: ${error instanceof Error ? error.message : String(error)}</div>`;
      // Disable generate button on error
      this.generateButton.disabled = true;
    }
  }
  
  /**
   * Create an image input with drop area and file selection
   */
  private createImageInput(formGroup: HTMLDivElement, nodeId: string, inputKey: string, labelText: string): void {
    // Create a unique field ID using nodeId and a slugified version of the label
    const fieldId = `editable-${nodeId}-${this.slugify(labelText)}`;
    
    // Create a drop area with updated styles and structure
    const dropArea = document.createElement("div");
    dropArea.classList.add("image-upload-area", "d-flex", "flex-column", "align-items-center", "justify-content-center");
    dropArea.id = `dropArea-${fieldId}`;
    
    // Create an instructional text
    const instruction = document.createElement("div");
    instruction.classList.add("text-secondary", "mb-2");
    instruction.textContent = "Drop an image or click to select a file.";
    dropArea.appendChild(instruction);
    
    // Add an icon (using Bootstrap icons)
    const iconDiv = document.createElement("div");
    iconDiv.classList.add("text-secondary", "mb-3");
    iconDiv.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" class="bi bi-cloud-arrow-up" viewBox="0 0 16 16">
      <path fill-rule="evenodd" d="M7.646 5.146a.5.5 0 0 1 .708 0l2 2a.5.5 0 0 1-.708.708L8.5 6.707V10.5a.5.5 0 0 1-1 0V6.707L6.354 7.854a.5.5 0 1 1-.708-.708l2-2z"/>
      <path d="M4.406 3.342A5.53 5.53 0 0 1 8 2c2.69 0 4.923 2 5.166 4.579C14.758 6.804 16 8.137 16 9.773 16 11.569 14.502 13 12.687 13H3.781C1.708 13 0 11.366 0 9.318c0-1.763 1.266-3.223 2.942-3.593.143-.863.698-1.723 1.464-2.383zm.653.757c-.757.653-1.153 1.44-1.153 2.056v.448l-.445.049C2.064 6.805 1 7.952 1 9.318 1 10.785 2.23 12 3.781 12h8.906C13.98 12 15 10.988 15 9.773c0-1.216-1.02-2.228-2.313-2.228h-.5v-.5C12.188 4.825 10.328 3 8 3a4.53 4.53 0 0 0-2.941 1.1z"/>
    </svg>`;
    dropArea.appendChild(iconDiv);
    
    // Create an img element for preview, center aligned, initially hidden
    const previewImg = document.createElement("img");
    previewImg.style.display = "none";
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
    
    // Create a status message element for this upload field
    const uploadStatus = document.createElement("div");
    uploadStatus.classList.add("upload-status", "mt-2", "small");
    uploadStatus.id = `status-${fieldId}`;
    formGroup.appendChild(uploadStatus);
    
    // Event listeners for drag and drop and click-to-upload
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
      e.preventDefault();
      dropArea.style.borderColor = "#ccc";
      dropArea.classList.remove("border-primary");
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
   * Create a number input field with Bootstrap styling
   */
  private createNumberInput(formGroup: HTMLDivElement, nodeId: string, inputKey: string, defaultValue: number): void {
    const numberInput = document.createElement("input");
    numberInput.type = "number";
    numberInput.classList.add("form-control");
    numberInput.value = defaultValue.toString();
    numberInput.addEventListener("change", () => {
      this.userEditableValues[nodeId][inputKey] = parseFloat(numberInput.value);
    });
    formGroup.appendChild(numberInput);
    // Initialize with default value
    this.userEditableValues[nodeId][inputKey] = defaultValue;
  }
  
  /**
   * Create a text input field with Bootstrap styling
   */
  private createTextInput(formGroup: HTMLDivElement, nodeId: string, inputKey: string, defaultValue: string): void {
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
  private async handleEditableFile(file: File, nodeId: string, inputKey: string, fieldId: string): Promise<void> {
    const previewImg = document.getElementById(`preview-${fieldId}`) as HTMLImageElement;
    const fileInput = document.getElementById(`fileInput-${fieldId}`) as HTMLInputElement;
    const dropArea = document.getElementById(`dropArea-${fieldId}`) as HTMLDivElement;
    const uploadStatus = document.getElementById(`status-${fieldId}`) as HTMLDivElement;
    
    // Safely get elements, using optional chaining and null checks
    const instructionEl = dropArea.querySelector(".text-secondary");
    const iconEl = dropArea.querySelector("svg")?.parentElement;
    
    try {
      // Show loading state in the upload status element
      if (uploadStatus) {
        uploadStatus.innerHTML = `
          <div class="spinner-border spinner-border-sm text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          <span class="ms-2">Uploading image for ${inputKey}...</span>
        `;
      }
      
      // Show loading state in the main status element too
      this.statusElement.textContent = `Uploading image for ${inputKey}...`;
      
      // Convert the uploaded file to JPEG
      const jpegDataUrl = await this.convertBlobToJpeg(file);
      previewImg.src = jpegDataUrl;
      previewImg.style.display = "block";
      
      // Hide the instruction text and icon when showing the preview
      if (instructionEl instanceof HTMLElement) instructionEl.style.display = "none";
      if (iconEl instanceof HTMLElement) iconEl.style.display = "none";
      
      // Convert the data URL back to a blob for uploading
      const responseDataUrl = await fetch(jpegDataUrl);
      const jpegBlob = await responseDataUrl.blob();
      
      const jpegFormData = new FormData();
      jpegFormData.append("image", jpegBlob, "converted.jpg");
      
      const uploadResponse = await fetch("http://127.0.0.1:8000/upload/image", {
        method: "POST",
        body: jpegFormData
      });
      
      if (!uploadResponse.ok) throw new Error("Upload failed.");
      const data = await uploadResponse.json();
      
      // Save the uploaded filename
      this.userEditableValues[nodeId][inputKey] = data.name;
      
      // Update status messages
      this.statusElement.textContent = "Image uploaded successfully.";
      if (uploadStatus) {
        uploadStatus.innerHTML = `
          <div class="text-success">
            <i class="bi bi-check-circle-fill me-1"></i>
            Image uploaded successfully (${data.name})
          </div>
        `;
      }
    } catch (error) {
      this.statusElement.textContent = `Error uploading image: ${error instanceof Error ? error.message : String(error)}`;
      
      if (uploadStatus) {
        uploadStatus.innerHTML = `
          <div class="text-danger">
            <i class="bi bi-exclamation-triangle-fill me-1"></i>
            Upload failed: ${error instanceof Error ? error.message : String(error)}
          </div>
        `;
      }
      
      // Reset the preview if there was an error
      previewImg.style.display = "none";
      if (instructionEl instanceof HTMLElement) instructionEl.style.display = "block";
      if (iconEl instanceof HTMLElement) iconEl.style.display = "block";
    }
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
  
  /**
   * Helper function to slugify text for IDs
   */
  private slugify(text: string): string {
    return text.toString().toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '');
  }
  
  /**
   * Update the workflow JSON with user provided values
   */
  updateWorkflowWithUserValues(workflow: Record<string, any>): Record<string, any> {
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