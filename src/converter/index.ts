import { WorkflowConverter } from './converter.js';

document.addEventListener('DOMContentLoaded', function() {
  // Initialize Ace Editor for the input (left column)
  const editor = (window as any).ace.edit("editor");
  editor.setTheme("ace/theme/monokai");
  editor.session.setMode("ace/mode/json");
  editor.session.setUseWrapMode(true);
  editor.setOptions({
    fontSize: "14px",
    showPrintMargin: false
  });

  // Initialize Ace Editor for the output (right column) in read-only mode
  const outputEditor = (window as any).ace.edit("output-editor");
  outputEditor.setTheme("ace/theme/monokai");
  outputEditor.session.setMode("ace/mode/json");
  outputEditor.setOptions({
    fontSize: "14px",
    readOnly: true,
    highlightActiveLine: false,
    highlightGutterLine: false,
  });
  outputEditor.renderer.$cursorLayer.element.style.display = "none"; // Hide the cursor

  // Initialize the workflow converter
  const converter = new WorkflowConverter();
  
  // Track workflow image file
  let workflowImageFile: File | null = null;

  // Preload sample JSON into the input editor
  const sampleJSON = {
    "10": {
      "inputs": {
        "ckpt_name": "001 - SDXL\\juggernautXL_v9Rdphoto2Lightning.safetensors"
      },
      "class_type": "CheckpointLoaderSimple",
      "_meta": {
        "title": "Load Checkpoint"
      }
    },
    "11": {
      "inputs": {
        "text": [
          "171",
          0
        ],
        "clip": [
          "187",
          0
        ]
      },
      "class_type": "CLIPTextEncode",
      "_meta": {
        "title": "CLIP Text Encode (Prompt)"
      }
    }
  };
  editor.setValue(JSON.stringify(sampleJSON, null, 2), -1);

  // Update both preview and output JSON
  function updateAll() {
    updateCards();
    updateOutputJson();
  }

  // Render the workflow nodes preview cards
  function updateCards() {
    const jsonText = editor.getValue();
    try {
      const jsonObj = JSON.parse(jsonText);
      converter.renderJsonCards(jsonObj, "cards-container");
    } catch (e) {
      showErrorModal(`Error rendering JSON: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Update the output JSON pane
  function updateOutputJson() {
    try {
      // Extract selection map from UI
      const selectionMap = converter.extractSelectionMapFromUI();
      
      // Get workflow details
      const workflowTitle = (document.getElementById("workflowTitle") as HTMLInputElement).value.trim() || "workflow";
      const safeTitle = workflowTitle.replace(/\s+/g, '-');
      
      // Determine image file name
      let workflowImageFileName = "";
      if (workflowImageFile) {
        const ext = workflowImageFile.name.substring(workflowImageFile.name.lastIndexOf('.'));
        workflowImageFileName = safeTitle + ext;
      }
      
      // Get workflow description
      const workflowDescription = (document.getElementById("workflowDescription") as HTMLInputElement).value.trim() || "";
      
      // Get the original JSON
      const originalJson = JSON.parse(editor.getValue());
      
      // Generate the output JSON
      const outputJson = converter.generateOutputJson(
        originalJson,
        selectionMap,
        {
          title: workflowTitle,
          imageFileName: workflowImageFileName,
          description: workflowDescription
        }
      );
      
      // Format and display the output JSON
      const formatted = JSON.stringify(outputJson, null, 2);
      outputEditor.setValue(formatted, -1);
    } catch (e) {
      showErrorModal(`Error generating output JSON: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Show error modal with a given message
  function showErrorModal(message: string) {
    const modalElement = document.getElementById('errorModal');
    if (modalElement) {
      const messageElement = modalElement.querySelector('#errorModalMessage');
      if (messageElement) {
        messageElement.textContent = message;
      }
      const modal = new (window as any).bootstrap.Modal(modalElement);
      modal.show();
    } else {
      alert(message); // Fallback if modal element not found
    }
  }

  // Initial rendering on page load
  updateAll();

  // Debounce changes in the input editor (500ms delay) to update preview and output
  let debounceTimer: number;
  editor.session.on('change', function() {
    clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(updateAll, 500);
  });

  // Set up workflow image drop area
  const dropArea = document.getElementById("workflowImageDropArea");
  if (dropArea) {
    // Handle dragover: indicate the area is active
    dropArea.addEventListener("dragover", function(e) {
      e.preventDefault();
      e.stopPropagation();
      (dropArea as HTMLElement).style.borderColor = "#333";
    });

    // Reset border when dragging leaves
    dropArea.addEventListener("dragleave", function(e) {
      e.preventDefault();
      e.stopPropagation();
      (dropArea as HTMLElement).style.borderColor = "#ccc";
    });

    // Handle drop event
    dropArea.addEventListener("drop", function(e) {
      e.preventDefault();
      e.stopPropagation();
      (dropArea as HTMLElement).style.borderColor = "#ccc";
      
      if (e.dataTransfer?.files.length && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        // Only accept image files
        if (file.type.startsWith("image/")) {
          workflowImageFile = file; // Store the file globally
          
          const reader = new FileReader();
          reader.onload = function(event) {
            if (event.target?.result) {
              // Set the drop area's background to the image preview
              (dropArea as HTMLElement).style.backgroundImage = `url(${event.target.result})`;
              (dropArea as HTMLElement).style.backgroundSize = "cover";
              (dropArea as HTMLElement).style.backgroundPosition = "center";
              
              // Hide the drop area text label
              const dropAreaText = document.getElementById("dropAreaText");
              if (dropAreaText) {
                dropAreaText.style.display = "none";
              }
              
              // Update the output JSON because the workflow image changed
              updateOutputJson();
            }
          };
          reader.readAsDataURL(file);
        } else {
          showErrorModal("Please drop a valid image file.");
        }
      }
    });
  }

  // Upload JSON functionality
  const uploadBtn = document.getElementById("uploadBtn");
  const fileInput = document.getElementById("fileInput") as HTMLInputElement | null;
  
  if (uploadBtn && fileInput) {
    uploadBtn.addEventListener("click", function() {
      fileInput.click();
    });
    
    fileInput.addEventListener("change", function() {
      if (fileInput.files && fileInput.files.length > 0) {
        handleFile(fileInput.files[0]);
      }
    });
  }

  // Drag and drop functionality for JSON files
  document.addEventListener("dragover", function(e) {
    e.preventDefault();
    e.stopPropagation();
  });
  
  document.addEventListener("drop", function(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer?.files.length && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  // Handle file reading, validation, and set workflow title based on the uploaded file name
  function handleFile(file: File) {
    if (file.type !== "application/json" && !file.name.endsWith(".json")) {
      showErrorModal("Please upload a valid JSON file.");
      return;
    }
    
    const reader = new FileReader();
    reader.onload = function(event) {
      if (event.target?.result) {
        const fileContent = event.target.result as string;
        try {
          JSON.parse(fileContent); // Validate JSON
          editor.setValue(fileContent, -1); // This triggers updateAll via the change event
          
          // Extract the base file name (remove extension) and update the Workflow title input
          const fileName = file.name;
          const baseName = fileName.replace(/\.[^/.]+$/, ""); // Remove extension
          
          const workflowTitleInput = document.getElementById("workflowTitle") as HTMLInputElement;
          if (workflowTitleInput) {
            workflowTitleInput.value = baseName;
          }
          
        } catch (error) {
          showErrorModal(`Error parsing JSON file: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    };
    
    reader.onerror = function() {
      showErrorModal("Error reading file.");
    };
    
    reader.readAsText(file);
  }

  // Export JSON functionality
  const exportBtn = document.getElementById("exportBtn");
  if (exportBtn) {
    exportBtn.addEventListener("click", async function() {
      try {
        // Get workflow title from the input and sanitize it
        const workflowTitleInput = document.getElementById("workflowTitle") as HTMLInputElement;
        const workflowTitle = workflowTitleInput?.value.trim() || "workflow";
        const safeTitle = workflowTitle.replace(/\s+/g, '-');
        
        // Get the output JSON from the output editor
        const outputJsonStr = outputEditor.getValue();
        
        // Get the input JSON from the input editor
        const inputJsonStr = editor.getValue();

        // Check if we should include manifest
        const includeManifest = (document.getElementById("includeManifest") as HTMLInputElement)?.checked;

        // Create ZIP file with the workflow files
        const zipBlob = await converter.createWorkflowZip(
          inputJsonStr,
          outputJsonStr,
          workflowTitle,
          workflowImageFile || undefined,
          includeManifest
        );
        
        // Download the ZIP file
        const zipFileName = `${safeTitle}.zip`;
        converter.downloadZip(zipBlob, zipFileName);
      } catch (error) {
        showErrorModal(`Error exporting workflow: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
  }

  // Add Workflow functionality
  const addWorkflowBtn = document.getElementById("addWorkflowBtn");
  if (addWorkflowBtn) {
    addWorkflowBtn.addEventListener("click", async function() {
      try {
        // Validate required fields
        const workflowTitle = (document.getElementById("workflowTitle") as HTMLInputElement)?.value.trim();
        if (!workflowTitle) {
          throw new Error('Workflow title is required');
        }

        // Show upload progress modal
        const uploadProgressModal = new (window as any).bootstrap.Modal(document.getElementById('uploadProgressModal'));
        uploadProgressModal.show();

        // Get the files
        const workflowJson = editor.getValue();
        const parametersJson = outputEditor.getValue();

        // Create safe title for folder and file names
        const safeTitle = workflowTitle.replace(/\s+/g, '-');

        // Create form data
        const formData = new FormData();
        formData.append('title', workflowTitle);
        formData.append('description', (document.getElementById("workflowDescription") as HTMLTextAreaElement)?.value || '');
        formData.append('version', '1.0.0');

        // Add workflow files with consistent naming
        const workflowBlob = new Blob([workflowJson], { type: 'application/json' });
        formData.append('workflow', workflowBlob, `${safeTitle}.json`);

        const parametersBlob = new Blob([parametersJson], { type: 'application/json' });
        formData.append('parameters', parametersBlob, `${safeTitle}-user-editable-parameters.json`);

        // Add preview image if available
        if (workflowImageFile) {
          const ext = workflowImageFile.name.substring(workflowImageFile.name.lastIndexOf('.'));
          const imageFileName = `${safeTitle}${ext}`;
          formData.append('preview', workflowImageFile, imageFileName);
        }

        // Upload to server
        const response = await fetch('/api/workflows', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to upload workflow');
        }

        // Hide progress modal
        uploadProgressModal.hide();

        // Show success modal
        const successModal = new (window as any).bootstrap.Modal(document.getElementById('successModal'));
        successModal.show();

        // Clear the workflow image
        workflowImageFile = null;
        const dropArea = document.getElementById("workflowImageDropArea");
        if (dropArea) {
          const span = dropArea.querySelector('span');
          if (span) {
            span.textContent = 'Drag & drop image here';
          }
          dropArea.style.backgroundImage = '';
        }
      } catch (error) {
        showErrorModal(`Error adding workflow: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
  }

  // Event delegation for parameter selection
  const cardsContainer = document.getElementById("cards-container");
  if (cardsContainer) {
    cardsContainer.addEventListener("change", function(e) {
      const target = e.target as HTMLElement;
      if (target) {
        if (target.classList.contains("persist-checkbox")) {
          const li = target.closest("li");
          if (li) {
            if ((target as HTMLInputElement).checked) {
              li.classList.add("persist");
            } else {
              li.classList.remove("persist");
            }
          }
        }
        updateOutputJson();
      }
    });
  }
});