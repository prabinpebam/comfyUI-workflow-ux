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
        this.deleteConfirmModal = null;
        this.workflowToDelete = null;
        this.onWorkflowSelectedCallback = null;
        this.container = containerElement;
        this.modalElement = modalElement;
        // Initialize delete confirmation modal
        const deleteModalElement = document.getElementById('deleteWorkflowModal');
        if (deleteModalElement) {
            this.deleteConfirmModal = new window.bootstrap.Modal(deleteModalElement);
            // Set up delete confirmation button handler
            const confirmDeleteBtn = document.getElementById('confirmDeleteWorkflow');
            if (confirmDeleteBtn) {
                confirmDeleteBtn.addEventListener('click', () => this.handleDeleteConfirm());
            }
        }
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
            // Fetch the workflow manifest
            const manifestResponse = await fetch('workflow/manifest.json', {
                headers: { 'Cache-Control': 'no-cache' }
            });
            if (!manifestResponse.ok) {
                throw new Error('Failed to load workflows manifest');
            }
            const manifest = await manifestResponse.json();
            // Load each workflow's metadata from its user-editable-parameters.json file
            for (const workflow of manifest.workflows) {
                try {
                    const response = await fetch(`workflow/${workflow.path}/${workflow.path}-user-editable-parameters.json`, {
                        // Add cache busting to ensure we're getting the latest version of the file
                        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache', 'Expires': '0' },
                        cache: 'no-store'
                    });
                    if (!response.ok)
                        continue;
                    const paramsJson = await response.json();
                    if (!paramsJson.workflowDetails || !paramsJson.workflowDetails.title)
                        continue;
                    // Ensure we're using the exact title without any transformations
                    const workflowTitle = String(paramsJson.workflowDetails.title);
                    this.workflows.push({
                        id: workflow.path,
                        title: workflowTitle,
                        description: paramsJson.workflowDetails.description || '',
                        previewImage: `workflow/${workflow.path}/${paramsJson.workflowDetails.image || `${workflow.path}.png`}`
                    });
                }
                catch (error) {
                    console.warn(`Failed to load workflow ${workflow.path}:`, error);
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
            if (!paramsJson.workflowDetails || !paramsJson.workflowDetails.title) {
                throw new Error("Workflow metadata is missing title");
            }
            // Ensure we're using the exact title without any transformations
            const workflowTitle = String(paramsJson.workflowDetails.title);
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
     * Handle confirmed workflow deletion
     */
    async handleDeleteConfirm() {
        var _a;
        if (!this.workflowToDelete)
            return;
        try {
            // Send delete request to server
            const response = await fetch(`/api/workflows/${this.workflowToDelete}`, {
                method: 'DELETE'
            });
            if (!response.ok) {
                let errorMessage;
                try {
                    const error = await response.json();
                    errorMessage = error.message || 'Failed to delete workflow';
                }
                catch (_b) {
                    // If response is not JSON or is empty, use status text
                    errorMessage = response.statusText || `Server returned ${response.status}`;
                }
                throw new Error(errorMessage);
            }
            // Remove workflow from local array
            this.workflows = this.workflows.filter(w => w.id !== this.workflowToDelete);
            // If this was the selected workflow, clear selection
            if (this.selectedWorkflow === this.workflowToDelete) {
                this.selectedWorkflow = null;
            }
            // Hide delete confirmation modal
            (_a = this.deleteConfirmModal) === null || _a === void 0 ? void 0 : _a.hide();
            // Re-render workflows
            this.renderWorkflows();
        }
        catch (error) {
            console.error('Error deleting workflow:', error);
            alert(`Failed to delete workflow: ${error instanceof Error ? error.message : String(error)}`);
        }
        finally {
            this.workflowToDelete = null;
        }
    }
    /**
     * Prompt for workflow deletion
     */
    confirmDelete(workflowId, workflowTitle) {
        var _a;
        this.workflowToDelete = workflowId;
        // Update modal content with workflow name
        const workflowNameElement = document.getElementById('deleteWorkflowName');
        if (workflowNameElement) {
            workflowNameElement.textContent = workflowTitle;
        }
        // Show the modal
        (_a = this.deleteConfirmModal) === null || _a === void 0 ? void 0 : _a.show();
    }
    /**
     * Render the workflows in the container as cards
     */
    renderWorkflows() {
        this.container.innerHTML = "";
        this.workflows.forEach((workflow) => {
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
            <div class="card-body d-flex flex-column">
              <div class="d-flex justify-content-between align-items-start mb-2">
                <h5 class="card-title mb-0">${workflow.title}</h5>
                <button class="btn btn-sm btn-outline-danger delete-workflow" title="Delete workflow">
                  <i class="bi bi-trash"></i>
                </button>
              </div>
              <p class="card-text">${workflow.description}</p>
            </div>
          </div>
        </div>
      `;
            // Add click handlers
            card.addEventListener("click", (e) => {
                // Don't select workflow if delete button was clicked
                if (!e.target.closest('.delete-workflow')) {
                    this.selectWorkflow(workflow.id);
                }
            });
            // Add delete button handler
            const deleteBtn = card.querySelector('.delete-workflow');
            if (deleteBtn) {
                deleteBtn.addEventListener("click", (e) => {
                    e.stopPropagation(); // Prevent card selection
                    this.confirmDelete(workflow.id, workflow.title);
                });
            }
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
                var _a;
                if (((_a = card.querySelector(`.card-title`)) === null || _a === void 0 ? void 0 : _a.textContent) === selectedWorkflowMetadata.title) {
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