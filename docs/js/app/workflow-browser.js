/**
 * WorkflowBrowser class - Handles loading and displaying available workflows in the modal
 */
export class WorkflowBrowser {
    /**
     * Create a new WorkflowBrowser
     * @param containerElement - The element to display workflows in
     * @param modalElement - The modal element that contains the workflow selection UI
     */
    constructor(containerElement, modalElement = null) {
        this.selectedWorkflow = null;
        this.workflows = [];
        this.modalElement = null;
        this.onWorkflowSelectedCallback = null;
        this.container = containerElement;
        this.modalElement = modalElement;
    }
    /**
     * Get the currently selected workflow
     */
    getSelectedWorkflow() {
        return this.selectedWorkflow;
    }
    /**
     * Get metadata for the currently selected workflow
     */
    getSelectedWorkflowMetadata() {
        if (!this.selectedWorkflow)
            return null;
        return this.workflows.find(workflow => workflow.id === this.selectedWorkflow) || null;
    }
    /**
     * Set callback function for when a workflow is selected
     */
    setOnWorkflowSelectedCallback(callback) {
        this.onWorkflowSelectedCallback = callback;
    }
    /**
     * Show the workflow selection modal
     */
    showModal() {
        // Refresh workflows to ensure we have the latest data before showing the modal
        this.loadWorkflows().then(() => {
            if (this.modalElement) {
                const modal = new window.bootstrap.Modal(this.modalElement);
                modal.show();
            }
        }).catch(error => {
            console.error("Error refreshing workflows before showing modal:", error);
            // If there's an error, still attempt to show the modal with existing data
            if (this.modalElement) {
                const modal = new window.bootstrap.Modal(this.modalElement);
                modal.show();
            }
        });
    }
    /**
     * Hide the workflow selection modal
     */
    hideModal() {
        if (this.modalElement) {
            const modal = window.bootstrap.Modal.getInstance(this.modalElement);
            if (modal) {
                modal.hide();
            }
        }
    }
    /**
     * Load available workflows from the server
     */
    async loadWorkflows() {
        try {
            this.workflows = [];
            // Fetch directory listing for the workflow folder
            const response = await fetch('workflow/');
            if (!response.ok) {
                throw new Error('Failed to load workflows directory');
            }
            const text = await response.text();
            // Parse the directory listing HTML to find workflow folders
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, 'text/html');
            const links = Array.from(doc.querySelectorAll('a')).map(a => a.getAttribute('href') || '');
            // Filter for directory entries (they end with /)
            const workflowPaths = links
                .filter(href => href.endsWith('/'))
                .map(href => href.slice(0, -1)); // Remove trailing slash
            // Load each workflow's metadata from its user-editable-parameters.json file
            for (const workflowPath of workflowPaths) {
                try {
                    const response = await fetch(`workflow/${workflowPath}/${workflowPath}-user-editable-parameters.json`, {
                        // Add cache busting to ensure we're getting the latest version of the file
                        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache', 'Expires': '0' },
                        cache: 'no-store'
                    });
                    if (!response.ok)
                        continue;
                    const paramsJson = await response.json();
                    // Debug output to verify what's in the JSON file
                    console.log(`Loading workflow ${workflowPath}`, {
                        workflowDetails: paramsJson.workflowDetails,
                        title: paramsJson.workflowDetails?.title,
                        fullJson: paramsJson
                    });
                    if (!paramsJson.workflowDetails || !paramsJson.workflowDetails.title)
                        continue;
                    // Ensure we're using the exact title without any transformations
                    const workflowTitle = String(paramsJson.workflowDetails.title);
                    console.log(`Workflow title (exact): "${workflowTitle}"`);
                    this.workflows.push({
                        id: workflowPath,
                        title: workflowTitle,
                        description: paramsJson.workflowDetails.description || '',
                        previewImage: `workflow/${workflowPath}/${paramsJson.workflowDetails.image || `${workflowPath}.png`}`
                    });
                    // Debug output for added workflow
                    console.log(`Added workflow to list:`, this.workflows[this.workflows.length - 1]);
                }
                catch (error) {
                    console.warn(`Failed to load workflow ${workflowPath}:`, error);
                    // Skip this workflow but continue loading others
                    continue;
                }
            }
            // Sort workflows alphabetically by title
            this.workflows.sort((a, b) => a.title.localeCompare(b.title));
            // If we have a previously selected workflow, refresh its metadata
            if (this.selectedWorkflow) {
                await this.refreshSelectedWorkflowMetadata();
            }
            this.renderWorkflows();
        }
        catch (error) {
            console.error("Error loading workflows:", error);
            this.container.innerHTML = `<div class="alert alert-danger">Failed to load workflows: ${error instanceof Error ? error.message : String(error)}</div>`;
        }
    }
    /**
     * Refresh metadata for the currently selected workflow
     * This ensures we have the latest title, description, etc. from the JSON file
     */
    async refreshSelectedWorkflowMetadata() {
        if (!this.selectedWorkflow)
            return;
        try {
            const workflowPath = this.selectedWorkflow;
            const response = await fetch(`workflow/${workflowPath}/${workflowPath}-user-editable-parameters.json`, {
                // Add cache busting to ensure we're getting the latest version of the file
                headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache', 'Expires': '0' },
                cache: 'no-store'
            });
            if (!response.ok) {
                throw new Error(`Failed to refresh workflow metadata (${response.status})`);
            }
            const paramsJson = await response.json();
            console.log(`Refreshing metadata for workflow ${workflowPath}`, {
                workflowDetails: paramsJson.workflowDetails,
                title: paramsJson.workflowDetails?.title
            });
            if (!paramsJson.workflowDetails || !paramsJson.workflowDetails.title) {
                throw new Error("Workflow metadata is missing title");
            }
            // Ensure we're using the exact title without any transformations
            const workflowTitle = String(paramsJson.workflowDetails.title);
            console.log(`Refreshed workflow title (exact): "${workflowTitle}"`);
            // Find the workflow in our array and update its metadata
            const workflowIndex = this.workflows.findIndex(w => w.id === this.selectedWorkflow);
            if (workflowIndex >= 0) {
                this.workflows[workflowIndex] = {
                    id: workflowPath,
                    title: workflowTitle,
                    description: paramsJson.workflowDetails.description || '',
                    previewImage: `workflow/${workflowPath}/${paramsJson.workflowDetails.image || `${workflowPath}.png`}`
                };
                // If we have a callback, notify it of the updated metadata
                if (this.onWorkflowSelectedCallback) {
                    this.onWorkflowSelectedCallback(workflowPath, this.workflows[workflowIndex]);
                }
            }
        }
        catch (error) {
            console.error(`Error refreshing metadata for workflow ${this.selectedWorkflow}:`, error);
        }
    }
    /**
     * Render the workflows in the container as cards
     */
    renderWorkflows() {
        this.container.innerHTML = "";
        this.workflows.forEach((workflow, index) => {
            const card = document.createElement("div");
            card.classList.add("card", "workflow-card");
            if (workflow.id === this.selectedWorkflow) {
                card.classList.add("selected");
            }
            card.innerHTML = `
        <div class="row g-0">
          <div class="col-md-4">
            <div class="square-img-container">
              <img src="${workflow.previewImage}" class="img-fluid" alt="${workflow.title}">
            </div>
          </div>
          <div class="col-md-8">
            <div class="card-body">
              <h5 class="card-title">${workflow.title}</h5>
              <p class="card-text">${workflow.description}</p>
            </div>
          </div>
        </div>
      `;
            // Make the entire card clickable
            card.addEventListener("click", () => {
                this.selectWorkflow(workflow.id);
            });
            this.container.appendChild(card);
        });
    }
    /**
     * Select a workflow by id
     */
    selectWorkflow(workflowId) {
        // Find the workflow metadata
        const selectedWorkflowMetadata = this.workflows.find(workflow => workflow.id === workflowId);
        if (selectedWorkflowMetadata) {
            // Update the selected workflow
            this.selectedWorkflow = workflowId;
            // Update UI to show which workflow is selected
            const cards = this.container.querySelectorAll(".workflow-card");
            cards.forEach(card => {
                if (card.querySelector(`.card-title`)?.textContent === selectedWorkflowMetadata.title) {
                    card.classList.add("selected");
                }
                else {
                    card.classList.remove("selected");
                }
            });
            // Call the callback if provided
            if (this.onWorkflowSelectedCallback) {
                this.onWorkflowSelectedCallback(workflowId, selectedWorkflowMetadata);
            }
            // Hide the modal
            this.hideModal();
        }
    }
}
//# sourceMappingURL=workflow-browser.js.map