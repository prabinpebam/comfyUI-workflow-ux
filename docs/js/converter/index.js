import { WorkflowConverter } from './converter.js';
document.addEventListener('DOMContentLoaded', function () {
    // Initialize Ace Editor for the input (left column)
    const editor = window.ace.edit("editor");
    editor.setTheme("ace/theme/monokai");
    editor.session.setMode("ace/mode/json");
    editor.session.setUseWrapMode(true);
    editor.setOptions({
        fontSize: "14px",
        showPrintMargin: false
    });
    // Initialize Ace Editor for the output (right column) in read-only mode
    const outputEditor = window.ace.edit("output-editor");
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
    let workflowImageFile = null;
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
        }
        catch (e) {
            showErrorModal(`Error rendering JSON: ${e instanceof Error ? e.message : String(e)}`);
        }
    }
    // Update the output JSON pane
    function updateOutputJson() {
        try {
            // Extract selection map from UI
            const selectionMap = converter.extractSelectionMapFromUI();
            // Get workflow details
            const workflowTitle = document.getElementById("workflowTitle").value.trim() || "workflow";
            const safeTitle = workflowTitle.replace(/\s+/g, '-');
            // Determine image file name
            let workflowImageFileName = "";
            if (workflowImageFile) {
                const ext = workflowImageFile.name.substring(workflowImageFile.name.lastIndexOf('.'));
                workflowImageFileName = safeTitle + ext;
            }
            // Get workflow description
            const workflowDescription = document.getElementById("workflowDescription").value.trim() || "";
            // Get the original JSON
            const originalJson = JSON.parse(editor.getValue());
            // Generate the output JSON
            const outputJson = converter.generateOutputJson(originalJson, selectionMap, {
                title: workflowTitle,
                imageFileName: workflowImageFileName,
                description: workflowDescription
            });
            // Format and display the output JSON
            const formatted = JSON.stringify(outputJson, null, 2);
            outputEditor.setValue(formatted, -1);
        }
        catch (e) {
            showErrorModal(`Error generating output JSON: ${e instanceof Error ? e.message : String(e)}`);
        }
    }
    // Show error modal with a given message
    function showErrorModal(message) {
        const messageElement = document.getElementById("errorModalMessage");
        if (messageElement) {
            messageElement.textContent = message;
        }
        $("#errorModal").modal("show");
    }
    // Initial rendering on page load
    updateAll();
    // Debounce changes in the input editor (500ms delay) to update preview and output
    let debounceTimer;
    editor.session.on('change', function () {
        clearTimeout(debounceTimer);
        debounceTimer = window.setTimeout(updateAll, 500);
    });
    // Set up workflow image drop area
    const dropArea = document.getElementById("workflowImageDropArea");
    if (dropArea) {
        // Handle dragover: indicate the area is active
        dropArea.addEventListener("dragover", function (e) {
            e.preventDefault();
            e.stopPropagation();
            dropArea.style.borderColor = "#333";
        });
        // Reset border when dragging leaves
        dropArea.addEventListener("dragleave", function (e) {
            e.preventDefault();
            e.stopPropagation();
            dropArea.style.borderColor = "#ccc";
        });
        // Handle drop event
        dropArea.addEventListener("drop", function (e) {
            e.preventDefault();
            e.stopPropagation();
            dropArea.style.borderColor = "#ccc";
            if (e.dataTransfer?.files.length && e.dataTransfer.files.length > 0) {
                const file = e.dataTransfer.files[0];
                // Only accept image files
                if (file.type.startsWith("image/")) {
                    workflowImageFile = file; // Store the file globally
                    const reader = new FileReader();
                    reader.onload = function (event) {
                        if (event.target?.result) {
                            // Set the drop area's background to the image preview
                            dropArea.style.backgroundImage = `url(${event.target.result})`;
                            dropArea.style.backgroundSize = "cover";
                            dropArea.style.backgroundPosition = "center";
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
                }
                else {
                    showErrorModal("Please drop a valid image file.");
                }
            }
        });
    }
    // Upload JSON functionality
    const uploadBtn = document.getElementById("uploadBtn");
    const fileInput = document.getElementById("fileInput");
    if (uploadBtn && fileInput) {
        uploadBtn.addEventListener("click", function () {
            fileInput.click();
        });
        fileInput.addEventListener("change", function () {
            if (fileInput.files && fileInput.files.length > 0) {
                handleFile(fileInput.files[0]);
            }
        });
    }
    // Drag and drop functionality for JSON files
    document.addEventListener("dragover", function (e) {
        e.preventDefault();
        e.stopPropagation();
    });
    document.addEventListener("drop", function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer?.files.length && e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
        }
    });
    // Handle file reading, validation, and set workflow title based on the uploaded file name
    function handleFile(file) {
        if (file.type !== "application/json" && !file.name.endsWith(".json")) {
            showErrorModal("Please upload a valid JSON file.");
            return;
        }
        const reader = new FileReader();
        reader.onload = function (event) {
            if (event.target?.result) {
                const fileContent = event.target.result;
                try {
                    JSON.parse(fileContent); // Validate JSON
                    editor.setValue(fileContent, -1); // This triggers updateAll via the change event
                    // Extract the base file name (remove extension) and update the Workflow title input
                    const fileName = file.name;
                    const baseName = fileName.replace(/\.[^/.]+$/, ""); // Remove extension
                    const workflowTitleInput = document.getElementById("workflowTitle");
                    if (workflowTitleInput) {
                        workflowTitleInput.value = baseName;
                    }
                }
                catch (error) {
                    showErrorModal(`Error parsing JSON file: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
        };
        reader.onerror = function () {
            showErrorModal("Error reading file.");
        };
        reader.readAsText(file);
    }
    // Export JSON functionality
    const exportBtn = document.getElementById("exportBtn");
    if (exportBtn) {
        exportBtn.addEventListener("click", async function () {
            // Get workflow title from the input and sanitize it
            const workflowTitleInput = document.getElementById("workflowTitle");
            const workflowTitle = workflowTitleInput?.value.trim() || "workflow";
            const safeTitle = workflowTitle.replace(/\s+/g, '-');
            // Get the output JSON from the output editor
            const outputJsonStr = outputEditor.getValue();
            // Get the input JSON from the input editor
            const inputJsonStr = editor.getValue();
            try {
                // Create ZIP file with the workflow files
                const zipBlob = await converter.createWorkflowZip(inputJsonStr, outputJsonStr, workflowTitle, workflowImageFile || undefined);
                // Download the ZIP file
                const zipFileName = `${safeTitle}.zip`;
                converter.downloadZip(zipBlob, zipFileName);
            }
            catch (error) {
                showErrorModal(`Error creating ZIP file: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
    }
    // Event delegation for parameter selection
    const cardsContainer = document.getElementById("cards-container");
    if (cardsContainer) {
        cardsContainer.addEventListener("change", function (e) {
            const target = e.target;
            if (target) {
                if (target.classList.contains("persist-checkbox")) {
                    const li = target.closest("li");
                    if (li) {
                        if (target.checked) {
                            li.classList.add("persist");
                        }
                        else {
                            li.classList.remove("persist");
                        }
                    }
                }
                updateOutputJson();
            }
        });
    }
});
//# sourceMappingURL=index.js.map