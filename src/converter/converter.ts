/**
 * Interface for workflow node data
 */
interface WorkflowNode {
  inputs: Record<string, any>;
  class_type: string;
  _meta?: {
    title?: string;
  };
}

/**
 * Interface for workflow data
 */
interface WorkflowData {
  [nodeId: string]: WorkflowNode;
}

/**
 * Interface for editable input definition
 */
interface EditableInput {
  value: any;
  selectedType: string;
  label: string;
}

/**
 * Interface for persisted node details for conversion
 */
interface PersistedNode {
  [key: string]: { type: string; label: string };
}

/**
 * Interface for output workflow with user-editable parameters
 */
interface OutputWorkflow {
  [nodeId: string]: {
    inputs: {
      [key: string]: EditableInput;
    };
  } | {
    title: string;
    image: string;
    description: string;
  };
}

/**
 * Class for converting ComfyUI workflows into user-editable parameter format
 */
export class WorkflowConverter {
  /**
   * Render JSON nodes as visual cards in the UI
   * @param jsonObj - The workflow JSON object
   * @param containerId - ID of the container element
   */
  renderJsonCards(jsonObj: WorkflowData, containerId: string): void {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Container element with ID "${containerId}" not found`);
      return;
    }
    
    container.innerHTML = ""; // Clear previous content

    for (const node in jsonObj) {
      if (jsonObj.hasOwnProperty(node)) {
        const nodeData = jsonObj[node];
        const title = (nodeData._meta && nodeData._meta.title) ? nodeData._meta.title : "";
        const cardHeader = `${node}: ${title}`;
        
        // Build list items for each input in the node
        const inputs = nodeData.inputs;
        let listItemsHtml = "";
        
        if (inputs) {
          for (const key in inputs) {
            if (inputs.hasOwnProperty(key)) {
              let value = inputs[key];
              // If value is an array, use only its first element
              if (Array.isArray(value)) {
                value = value[0];
              }
              
              // Determine icon and list-group class based on key and value
              let iconHtml = '';
              let listItemClass = "list-group-item"; // default
              
              if (key.toLowerCase() === "text") {
                iconHtml = '<i class="bi bi-card-text"></i>';
                listItemClass += " list-group-item-success";
              } else if (key.toLowerCase() === "seed") {
                iconHtml = '<i class="bi bi-dice-5-fill"></i>';
                listItemClass += " list-group-item-warning";
              } else if (key.toLowerCase() === "image") {
                iconHtml = '<i class="bi bi-image"></i>';
                listItemClass += " list-group-item-warning";
              } else if (key.toLowerCase() === "url") {
                iconHtml = '<i class="bi bi-globe"></i>';
                listItemClass += " list-group-item-success";
              } else if (typeof value === "number") {
                iconHtml = '<i class="bi bi-123"></i>';
                listItemClass += " list-group-item-info";
              } else {
                iconHtml = '<i class="bi bi-dash"></i>';
              }
              
              // Determine default dropdown type
              let defaultType = "String";
              if (key.toLowerCase() === "seed") {
                defaultType = "Number";
              } else if (typeof value === "number") {
                defaultType = "Number";
              } else if (key.toLowerCase() === "image") {
                defaultType = "Image";
              }
              
              // Extra options for parameter configuration
              const extraOptionsHtml = `
                <div class="extra-options">
                  <input type="checkbox" class="persist-checkbox mr-2">
                  <select class="type-dropdown form-control form-control-sm">
                    <option value="Number"${defaultType === "Number" ? " selected" : ""}>Number</option>
                    <option value="String"${defaultType === "String" ? " selected" : ""}>String</option>
                    <option value="Image"${defaultType === "Image" ? " selected" : ""}>Image</option>
                  </select>
                  <input type="text" class="label-input form-control form-control-sm ml-2" style="width: 150px;" value="${key}">
                </div>
              `;
              
              // Include data attributes for node and key
              listItemsHtml += `
                <li class="${listItemClass} d-flex justify-content-between align-items-center" data-node="${node}" data-key="${key}">
                  <div class="item-content" style="flex: 1;">${iconHtml} <strong>${key}</strong>: ${value}</div>
                  ${extraOptionsHtml}
                </li>
              `;
            }
          }
        }
        
        // Build the card HTML
        const cardHtml = `
          <div class="card mb-3">
            <div class="card-header"><h3>${cardHeader}</h3></div>
            <div class="card-body">
              <ul class="list-group list-group-flush">${listItemsHtml}</ul>
            </div>
          </div>
        `;
        
        container.innerHTML += cardHtml;
      }
    }
  }
  
  /**
   * Generate output JSON based on selected (persisted) items
   * @param originalJson - The original workflow JSON
   * @param selectionMap - Map of selected nodes and their parameters
   * @param workflowDetails - Details about the workflow (title, image, description)
   * @returns The converted output JSON for user-editable parameters
   */
  generateOutputJson(
    originalJson: WorkflowData, 
    selectionMap: Record<string, PersistedNode>,
    workflowDetails: { title: string, imageFileName: string, description: string }
  ): OutputWorkflow {
    const output: OutputWorkflow = {};
    
    for (const node in originalJson) {
      if (originalJson.hasOwnProperty(node) && selectionMap[node]) {
        const newNode = { ...originalJson[node] };
        const newInputs: Record<string, EditableInput> = {};
        
        for (const key in originalJson[node].inputs) {
          if (selectionMap[node][key]) {
            let origVal = originalJson[node].inputs[key];
            if (Array.isArray(origVal)) {
              origVal = origVal[0];
            }
            
            newInputs[key] = {
              value: origVal,
              selectedType: selectionMap[node][key].type,
              label: selectionMap[node][key].label
            };
          }
        }
        
        // @ts-ignore - Need to cast to expected output structure
        output[node] = {
          inputs: newInputs
        };
      }
    }
    
    // Add workflow details
    output["workflowDetails"] = {
      title: workflowDetails.title,
      image: workflowDetails.imageFileName,
      description: workflowDetails.description
    };
    
    return output;
  }
  
  /**
   * Extract selection map from UI elements
   * @returns Selection map of nodes and their parameters
   */
  extractSelectionMapFromUI(): Record<string, PersistedNode> {
    const selectionMap: Record<string, PersistedNode> = {};
    const selectedItems = document.querySelectorAll("#cards-container li.d-flex.persist");
    
    selectedItems.forEach((li) => {
      const element = li as HTMLElement;
      const nodeId = element.getAttribute("data-node") || "";
      const key = element.getAttribute("data-key") || "";
      const dropdown = element.querySelector("select.type-dropdown") as HTMLSelectElement;
      const selectedType = dropdown ? dropdown.value : "String";
      const labelInput = element.querySelector("input.label-input") as HTMLInputElement;
      const labelValue = labelInput ? labelInput.value : key;
      
      if (!selectionMap[nodeId]) {
        selectionMap[nodeId] = {};
      }
      
      selectionMap[nodeId][key] = { 
        type: selectedType, 
        label: labelValue 
      };
    });
    
    return selectionMap;
  }
  
  /**
   * Create a ZIP file with the workflow files
   * @param inputJson - Original workflow JSON
   * @param outputJson - User-editable parameters JSON
   * @param workflowTitle - Title of the workflow
   * @param imageBlob - Optional workflow preview image
   */
  async createWorkflowZip(
    inputJson: string,
    outputJson: string,
    workflowTitle: string,
    imageBlob?: File
  ): Promise<Blob> {
    // Safe title for file names (replace spaces with hyphens)
    const safeTitle = workflowTitle.replace(/\s+/g, '-');
    
    // Prepare file names
    const outputFileName = `${safeTitle}-user-editable-parameters.json`;
    const inputFileName = `${safeTitle}.json`;
    
    // Handle the image file if provided
    let imageFileName = "";
    if (imageBlob) {
      const ext = imageBlob.name.substring(imageBlob.name.lastIndexOf('.'));
      imageFileName = `${safeTitle}${ext}`;
    }
    
    // Create a new JSZip instance
    // Note: JSZip is expected to be available globally
    const zip = new (window as any).JSZip();
    
    // Add files to the ZIP
    zip.file(outputFileName, outputJson);
    zip.file(inputFileName, inputJson);
    
    if (imageBlob) {
      zip.file(imageFileName, imageBlob);
    }
    
    // Generate the ZIP file
    return await zip.generateAsync({ type: "blob" });
  }
  
  /**
   * Download the ZIP file
   * @param blob - The ZIP file blob
   * @param fileName - Name for the downloaded file
   */
  downloadZip(blob: Blob, fileName: string): void {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  }
}