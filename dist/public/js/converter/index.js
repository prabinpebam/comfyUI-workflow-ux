import { WorkflowConverter } from './converter.js';
document.addEventListener('DOMContentLoaded', function () {
    const editor = window.ace.edit("editor");
    editor.setTheme("ace/theme/monokai");
    editor.session.setMode("ace/mode/json");
    editor.session.setUseWrapMode(true);
    editor.setOptions({
        fontSize: "14px",
        showPrintMargin: false
    });
    const outputEditor = window.ace.edit("output-editor");
    outputEditor.setTheme("ace/theme/monokai");
    outputEditor.session.setMode("ace/mode/json");
    outputEditor.setOptions({
        fontSize: "14px",
        readOnly: true,
        highlightActiveLine: false,
        highlightGutterLine: false,
    });
    outputEditor.renderer.$cursorLayer.element.style.display = "none";
    const converter = new WorkflowConverter();
    let workflowImageFile = null;
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
    function updateAll() {
        updateCards();
        updateOutputJson();
    }
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
    function updateOutputJson() {
        try {
            const selectionMap = converter.extractSelectionMapFromUI();
            const workflowTitle = document.getElementById("workflowTitle").value.trim() || "workflow";
            const safeTitle = workflowTitle.replace(/\s+/g, '-');
            let workflowImageFileName = "";
            if (workflowImageFile) {
                const ext = workflowImageFile.name.substring(workflowImageFile.name.lastIndexOf('.'));
                workflowImageFileName = safeTitle + ext;
            }
            const workflowDescription = document.getElementById("workflowDescription").value.trim() || "";
            const originalJson = JSON.parse(editor.getValue());
            const outputJson = converter.generateOutputJson(originalJson, selectionMap, {
                title: workflowTitle,
                imageFileName: workflowImageFileName,
                description: workflowDescription
            });
            const formatted = JSON.stringify(outputJson, null, 2);
            outputEditor.setValue(formatted, -1);
        }
        catch (e) {
            showErrorModal(`Error generating output JSON: ${e instanceof Error ? e.message : String(e)}`);
        }
    }
    function showErrorModal(message) {
        const modalElement = document.getElementById('errorModal');
        if (modalElement) {
            const messageElement = modalElement.querySelector('#errorModalMessage');
            if (messageElement) {
                messageElement.textContent = message;
            }
            const modal = new window.bootstrap.Modal(modalElement);
            modal.show();
        }
        else {
            alert(message);
        }
    }
    updateAll();
    let debounceTimer;
    editor.session.on('change', function () {
        clearTimeout(debounceTimer);
        debounceTimer = window.setTimeout(updateAll, 500);
    });
    const dropArea = document.getElementById("workflowImageDropArea");
    if (dropArea) {
        dropArea.addEventListener("dragover", function (e) {
            e.preventDefault();
            e.stopPropagation();
            dropArea.style.borderColor = "#333";
        });
        dropArea.addEventListener("dragleave", function (e) {
            e.preventDefault();
            e.stopPropagation();
            dropArea.style.borderColor = "#ccc";
        });
        dropArea.addEventListener("drop", function (e) {
            var _a;
            e.preventDefault();
            e.stopPropagation();
            dropArea.style.borderColor = "#ccc";
            if (((_a = e.dataTransfer) === null || _a === void 0 ? void 0 : _a.files.length) && e.dataTransfer.files.length > 0) {
                const file = e.dataTransfer.files[0];
                if (file.type.startsWith("image/")) {
                    workflowImageFile = file;
                    const reader = new FileReader();
                    reader.onload = function (event) {
                        var _a;
                        if ((_a = event.target) === null || _a === void 0 ? void 0 : _a.result) {
                            dropArea.style.backgroundImage = `url(${event.target.result})`;
                            dropArea.style.backgroundSize = "cover";
                            dropArea.style.backgroundPosition = "center";
                            const dropAreaText = document.getElementById("dropAreaText");
                            if (dropAreaText) {
                                dropAreaText.style.display = "none";
                            }
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
    document.addEventListener("dragover", function (e) {
        e.preventDefault();
        e.stopPropagation();
    });
    document.addEventListener("drop", function (e) {
        var _a;
        e.preventDefault();
        e.stopPropagation();
        if (((_a = e.dataTransfer) === null || _a === void 0 ? void 0 : _a.files.length) && e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
        }
    });
    function handleFile(file) {
        if (file.type !== "application/json" && !file.name.endsWith(".json")) {
            showErrorModal("Please upload a valid JSON file.");
            return;
        }
        const reader = new FileReader();
        reader.onload = function (event) {
            var _a;
            if ((_a = event.target) === null || _a === void 0 ? void 0 : _a.result) {
                const fileContent = event.target.result;
                try {
                    JSON.parse(fileContent);
                    editor.setValue(fileContent, -1);
                    const fileName = file.name;
                    const baseName = fileName.replace(/\.[^/.]+$/, "");
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
    const exportBtn = document.getElementById("exportBtn");
    if (exportBtn) {
        exportBtn.addEventListener("click", async function () {
            var _a;
            try {
                const workflowTitleInput = document.getElementById("workflowTitle");
                const workflowTitle = (workflowTitleInput === null || workflowTitleInput === void 0 ? void 0 : workflowTitleInput.value.trim()) || "workflow";
                const safeTitle = workflowTitle.replace(/\s+/g, '-');
                const outputJsonStr = outputEditor.getValue();
                const inputJsonStr = editor.getValue();
                const includeManifest = (_a = document.getElementById("includeManifest")) === null || _a === void 0 ? void 0 : _a.checked;
                const zipBlob = await converter.createWorkflowZip(inputJsonStr, outputJsonStr, workflowTitle, workflowImageFile || undefined, includeManifest);
                const zipFileName = `${safeTitle}.zip`;
                converter.downloadZip(zipBlob, zipFileName);
            }
            catch (error) {
                showErrorModal(`Error exporting workflow: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
    }
    const addWorkflowBtn = document.getElementById("addWorkflowBtn");
    if (addWorkflowBtn) {
        addWorkflowBtn.addEventListener("click", async function () {
            var _a, _b;
            try {
                const workflowTitle = (_a = document.getElementById("workflowTitle")) === null || _a === void 0 ? void 0 : _a.value.trim();
                if (!workflowTitle) {
                    throw new Error('Workflow title is required');
                }
                const uploadProgressModal = new window.bootstrap.Modal(document.getElementById('uploadProgressModal'));
                uploadProgressModal.show();
                const workflowJson = editor.getValue();
                const parametersJson = outputEditor.getValue();
                const safeTitle = workflowTitle.replace(/\s+/g, '-');
                const formData = new FormData();
                formData.append('title', workflowTitle);
                formData.append('description', ((_b = document.getElementById("workflowDescription")) === null || _b === void 0 ? void 0 : _b.value) || '');
                formData.append('version', '1.0.0');
                const workflowBlob = new Blob([workflowJson], { type: 'application/json' });
                formData.append('workflow', workflowBlob, `${safeTitle}.json`);
                const parametersBlob = new Blob([parametersJson], { type: 'application/json' });
                formData.append('parameters', parametersBlob, `${safeTitle}-user-editable-parameters.json`);
                if (workflowImageFile) {
                    const ext = workflowImageFile.name.substring(workflowImageFile.name.lastIndexOf('.'));
                    const imageFileName = `${safeTitle}${ext}`;
                    formData.append('preview', workflowImageFile, imageFileName);
                }
                console.log('🔍 Adding workflow with title:', workflowTitle);
                console.log('🔍 Safe title:', safeTitle);
                console.log('🔍 Form data entries:');
                for (const [key, value] of formData.entries()) {
                    if (value instanceof Blob) {
                        console.log(`🔍 ${key}:`, {
                            name: value.name,
                            type: value.type,
                            size: value.size
                        });
                    }
                    else {
                        console.log(`🔍 ${key}:`, value);
                    }
                }
                console.log('🔍 Workflow JSON:', workflowJson);
                console.log('🔍 Parameters JSON:', parametersJson);
                const response = await fetch('/api/workflows', {
                    method: 'POST',
                    body: formData
                });
                const responseData = await response.clone().json();
                console.log('🔍 Server response:', responseData);
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || 'Failed to upload workflow');
                }
                uploadProgressModal.hide();
                const successModal = new window.bootstrap.Modal(document.getElementById('successModal'));
                successModal.show();
                workflowImageFile = null;
                const dropArea = document.getElementById("workflowImageDropArea");
                if (dropArea) {
                    const span = dropArea.querySelector('span');
                    if (span) {
                        span.textContent = 'Drag & drop image here';
                    }
                    dropArea.style.backgroundImage = '';
                }
            }
            catch (error) {
                console.error('🔍 Error adding workflow:', error);
                showErrorModal(`Error adding workflow: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
    }
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
