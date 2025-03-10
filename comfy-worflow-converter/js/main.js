document.addEventListener('DOMContentLoaded', function() {
  // Initialize Ace Editor for the input (left column)
  var editor = ace.edit("editor");
  editor.setTheme("ace/theme/monokai");
  editor.session.setMode("ace/mode/json");
  editor.session.setUseWrapMode(true);
  editor.setOptions({
    fontSize: "14px",
    showPrintMargin: false
  });

  // Initialize Ace Editor for the output (right column) in read-only mode
  var outputEditor = ace.edit("output-editor");
  outputEditor.setTheme("ace/theme/monokai");
  outputEditor.session.setMode("ace/mode/json");
  outputEditor.setOptions({
    fontSize: "14px",
    readOnly: true,
    highlightActiveLine: false,
    highlightGutterLine: false,
  });
  outputEditor.renderer.$cursorLayer.element.style.display = "none"; // Hide the cursor

  // Preload sample JSON into the input editor
  var sampleJSON = {
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
    var jsonText = editor.getValue();
    try {
      var jsonObj = JSON.parse(jsonText);
      renderJsonCards(jsonObj);
    } catch (e) {
      showErrorModal("Error rendering JSON: " + e.message);
    }
  }

  // Generate output JSON based on selected (persisted) items.
  // For each selected item, include a new property "label" with the value from the text input.
  function generateOutputJson() {
    let originalJson = JSON.parse(editor.getValue());
    let selectionMap = {}; // mapping: node -> { key: { type: selectedType, label: labelValue } }
    let selectedItems = document.querySelectorAll("#cards-container li.d-flex.persist");
    selectedItems.forEach(li => {
      let nodeId = li.getAttribute("data-node");
      let key = li.getAttribute("data-key");
      let dropdown = li.querySelector("select.type-dropdown");
      let selectedType = dropdown ? dropdown.value : "String";
      let labelInput = li.querySelector("input.label-input");
      let labelValue = labelInput ? labelInput.value : key;
      if (!selectionMap[nodeId]) {
        selectionMap[nodeId] = {};
      }
      selectionMap[nodeId][key] = { type: selectedType, label: labelValue };
    });
    let output = {};
    for (let node in originalJson) {
      if (originalJson.hasOwnProperty(node) && selectionMap[node]) {
        let newNode = Object.assign({}, originalJson[node]);
        let newInputs = {};
        for (let key in originalJson[node].inputs) {
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
        newNode.inputs = newInputs;
        output[node] = newNode;
      }
    }
    
    // Append workflow details as a separate node.
    let workflowTitle = document.getElementById("workflowTitle").value.trim() || "workflow";
    let safeTitle = workflowTitle.replace(/\s+/g, '-');
    let workflowImageFileName = "";
    if (workflowImageFile) {
      let ext = workflowImageFile.name.substring(workflowImageFile.name.lastIndexOf('.'));
      workflowImageFileName = safeTitle + ext;
    }
    // Retrieve the workflow description
    let workflowDescription = document.getElementById("workflowDescription").value.trim() || "";
    
    output["workflowDetails"] = {
      title: workflowTitle,
      image: workflowImageFileName,
      description: workflowDescription
    };
    
    return output;
  }
  
  



  // Update the output JSON pane
  function updateOutputJson() {
    try {
      let outputJson = generateOutputJson();
      let formatted = JSON.stringify(outputJson, null, 2);
      outputEditor.setValue(formatted, -1);
    } catch (e) {
      showErrorModal("Error generating output JSON: " + e.message);
    }
  }

  // Initial rendering on page load
  updateAll();

  // Debounce changes in the input editor (500ms delay) to update preview and output
  var debounceTimer;
  editor.session.on('change', function() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(updateAll, 500);
  });

  // Workflow image file
  var workflowImageFile = null;

  // Get the drop area element
  var dropArea = document.getElementById("workflowImageDropArea");

  // Handle dragover: indicate the area is active
  dropArea.addEventListener("dragover", function(e) {
    e.preventDefault();
    e.stopPropagation();
    dropArea.style.borderColor = "#333";
  });

  // Reset border when dragging leaves
  dropArea.addEventListener("dragleave", function(e) {
    e.preventDefault();
    e.stopPropagation();
    dropArea.style.borderColor = "#ccc";
  });

  // Handle drop event
  dropArea.addEventListener("drop", function(e) {
    e.preventDefault();
    e.stopPropagation();
    dropArea.style.borderColor = "#ccc";
    if (e.dataTransfer.files.length > 0) {
      var file = e.dataTransfer.files[0];
      // Only accept image files
      if (file.type.startsWith("image/")) {
        workflowImageFile = file; // Store the file globally
        var reader = new FileReader();
        reader.onload = function(event) {
          // Set the drop area's background to the image preview
          dropArea.style.backgroundImage = "url(" + event.target.result + ")";
          dropArea.style.backgroundSize = "cover";
          dropArea.style.backgroundPosition = "center";
          // Hide the drop area text label
          document.getElementById("dropAreaText").style.display = "none";
          // Update the output JSON because the workflow image changed
          updateOutputJson();
        };
        reader.readAsDataURL(file);
      } else {
        showErrorModal("Please drop a valid image file.");
      }
    }
  });


  // Upload JSON functionality from the first column header
  var uploadBtn = document.getElementById("uploadBtn");
  var fileInput = document.getElementById("fileInput");
  uploadBtn.addEventListener("click", function() {
    fileInput.click();
  });
  fileInput.addEventListener("change", function() {
    if (fileInput.files.length > 0) {
      handleFile(fileInput.files[0]);
    }
  });

  // Drag and drop functionality for JSON files
  document.addEventListener("dragover", function(e) {
    e.preventDefault();
    e.stopPropagation();
  });
  document.addEventListener("drop", function(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  // Handle file reading, validation, and set workflow title based on the uploaded file name
  function handleFile(file) {
    if (file.type !== "application/json" && !file.name.endsWith(".json")) {
      showErrorModal("Please upload a valid JSON file.");
      return;
    }
    var reader = new FileReader();
    reader.onload = function(event) {
      var fileContent = event.target.result;
      try {
        JSON.parse(fileContent); // Validate JSON
        editor.setValue(fileContent, -1); // This triggers updateAll via the change event
        
        // Extract the base file name (remove extension) and update the Workflow title input
        var fileName = file.name;
        var baseName = fileName.replace(/\.[^/.]+$/, ""); // Remove extension
        document.getElementById("workflowTitle").value = baseName;
        
      } catch (error) {
        showErrorModal("Error parsing JSON file: " + error.message);
      }
    };
    reader.onerror = function() {
      showErrorModal("Error reading file.");
    };
    reader.readAsText(file);
  }

  // Export JSON: triggered by the Export button in the third column header
  var exportBtn = document.getElementById("exportBtn");
  exportBtn.addEventListener("click", function() {
    // Get workflow title from the input and sanitize it (replace spaces with '-')
    var workflowTitle = document.getElementById("workflowTitle").value.trim() || "workflow";
    var safeTitle = workflowTitle.replace(/\s+/g, '-');
    
    // Get the output JSON from the output editor (right column)
    var outputJsonStr = outputEditor.getValue();
    // Get the input JSON from the input editor (left column)
    var inputJsonStr = editor.getValue();
    
    // Prepare file names based on the workflow title
    var outputFileName = safeTitle + "-user-editable-parameters.json";
    var inputFileName = safeTitle + ".json";
    
    // Use the workflow image from the drag and drop (if available)
    var imageBlob = null;
    var imageFileName = "";
    if (workflowImageFile) {
      var ext = workflowImageFile.name.substring(workflowImageFile.name.lastIndexOf('.'));
      imageFileName = safeTitle + ext;
      imageBlob = workflowImageFile;
    }
    
    // Create a new zip file using JSZip
    var zip = new JSZip();
    zip.file(outputFileName, outputJsonStr);
    zip.file(inputFileName, inputJsonStr);
    if (imageBlob) {
      zip.file(imageFileName, imageBlob);
    }
    
    // Generate the zip file and trigger a download
    zip.generateAsync({type: "blob"}).then(function(content) {
      var zipFileName = safeTitle + ".zip";
      var a = document.createElement("a");
      a.href = URL.createObjectURL(content);
      a.download = zipFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    });
  });




  // Show error modal with a given message
  function showErrorModal(message) {
    document.getElementById("errorModalMessage").textContent = message;
    $("#errorModal").modal("show");
  }

  // Event delegation: persist extra options when checkbox is toggled and update output JSON on changes.
  document.getElementById("cards-container").addEventListener("change", function(e) {
    if (e.target) {
      if (e.target.classList.contains("persist-checkbox")) {
        var li = e.target.closest("li");
        if (e.target.checked) {
          li.classList.add("persist");
        } else {
          li.classList.remove("persist");
        }
      }
      updateOutputJson();
    }
  });
});
