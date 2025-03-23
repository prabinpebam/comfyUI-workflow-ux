export class WorkflowConverter {
    renderJsonCards(jsonObj, containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container element with ID "${containerId}" not found`);
            return;
        }
        container.innerHTML = "";
        for (const node in jsonObj) {
            if (jsonObj.hasOwnProperty(node)) {
                const nodeData = jsonObj[node];
                const title = (nodeData._meta && nodeData._meta.title) ? nodeData._meta.title : "";
                const cardHeader = `${node}: ${title}`;
                const inputs = nodeData.inputs;
                let listItemsHtml = "";
                if (inputs) {
                    for (const key in inputs) {
                        if (inputs.hasOwnProperty(key)) {
                            let value = inputs[key];
                            if (Array.isArray(value)) {
                                value = value[0];
                            }
                            let iconHtml = '';
                            let listItemClass = "list-group-item";
                            if (key.toLowerCase() === "text") {
                                iconHtml = '<i class="bi bi-card-text"></i>';
                                listItemClass += " list-group-item-success";
                            }
                            else if (key.toLowerCase() === "seed") {
                                iconHtml = '<i class="bi bi-dice-5-fill"></i>';
                                listItemClass += " list-group-item-warning";
                            }
                            else if (key.toLowerCase() === "image") {
                                iconHtml = '<i class="bi bi-image"></i>';
                                listItemClass += " list-group-item-warning";
                            }
                            else if (key.toLowerCase() === "url") {
                                iconHtml = '<i class="bi bi-globe"></i>';
                                listItemClass += " list-group-item-success";
                            }
                            else if (typeof value === "number") {
                                iconHtml = '<i class="bi bi-123"></i>';
                                listItemClass += " list-group-item-info";
                            }
                            else {
                                iconHtml = '<i class="bi bi-dash"></i>';
                            }
                            let defaultType = "String";
                            if (key.toLowerCase() === "seed") {
                                defaultType = "Number";
                            }
                            else if (typeof value === "number") {
                                defaultType = "Number";
                            }
                            else if (key.toLowerCase() === "image") {
                                defaultType = "Image";
                            }
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
                            listItemsHtml += `
                <li class="${listItemClass} d-flex justify-content-between align-items-center" data-node="${node}" data-key="${key}">
                  <div class="item-content" style="flex: 1;">${iconHtml} <strong>${key}</strong>: ${value}</div>
                  ${extraOptionsHtml}
                </li>
              `;
                        }
                    }
                }
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
    generateOutputJson(originalJson, selectionMap, workflowDetails) {
        const output = {};
        for (const node in originalJson) {
            if (originalJson.hasOwnProperty(node) && selectionMap[node]) {
                const newNode = { ...originalJson[node] };
                const newInputs = {};
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
                output[node] = {
                    inputs: newInputs
                };
            }
        }
        output["workflowDetails"] = {
            title: workflowDetails.title,
            image: workflowDetails.imageFileName,
            description: workflowDetails.description
        };
        return output;
    }
    extractSelectionMapFromUI() {
        const selectionMap = {};
        const selectedItems = document.querySelectorAll("#cards-container li.d-flex.persist");
        selectedItems.forEach((li) => {
            const element = li;
            const nodeId = element.getAttribute("data-node") || "";
            const key = element.getAttribute("data-key") || "";
            const dropdown = element.querySelector("select.type-dropdown");
            const selectedType = dropdown ? dropdown.value : "String";
            const labelInput = element.querySelector("input.label-input");
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
    async generateUpdatedManifest(workflowId) {
        try {
            const response = await fetch('workflow/manifest.json');
            if (!response.ok) {
                throw new Error('Failed to load manifest');
            }
            const manifest = await response.json();
            const baseId = workflowId
                .replace(/\.json$/, "")
                .replace(/[/\\]/g, "-")
                .replace(/\s+/g, "-");
            const cleanId = baseId.replace(/-+/g, "-");
            const existingIndex = manifest.workflows.findIndex(w => w.id === cleanId || w.path === cleanId);
            if (existingIndex >= 0) {
                manifest.workflows[existingIndex] = {
                    id: cleanId,
                    path: cleanId
                };
            }
            else {
                manifest.workflows.push({
                    id: cleanId,
                    path: cleanId
                });
            }
            manifest.workflows.sort((a, b) => a.id.localeCompare(b.id));
            return JSON.stringify(manifest, null, 2);
        }
        catch (error) {
            console.error('Error generating manifest:', error);
            throw error;
        }
    }
    async createWorkflowZip(inputJson, outputJson, workflowTitle, imageBlob, includeManifest = false) {
        const safeTitle = workflowTitle.replace(/\s+/g, '-');
        const outputFileName = `${safeTitle}-user-editable-parameters.json`;
        const inputFileName = `${safeTitle}.json`;
        let imageFileName = "";
        if (imageBlob) {
            const ext = imageBlob.name.substring(imageBlob.name.lastIndexOf('.'));
            imageFileName = `${safeTitle}${ext}`;
        }
        const zip = new window.JSZip();
        zip.file(outputFileName, outputJson);
        zip.file(inputFileName, inputJson);
        if (imageBlob) {
            zip.file(imageFileName, imageBlob);
        }
        if (includeManifest) {
            try {
                const manifestJson = await this.generateUpdatedManifest(safeTitle);
                zip.file('manifest.json', manifestJson);
            }
            catch (error) {
                console.warn('Failed to include manifest in ZIP:', error);
            }
        }
        return await zip.generateAsync({ type: "blob" });
    }
    downloadZip(blob, fileName) {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
    }
}
