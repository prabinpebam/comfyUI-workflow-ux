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
     * Set callback function for when a workflow is selected
     */
    setOnWorkflowSelectedCallback(callback) {
        this.onWorkflowSelectedCallback = callback;
    }
    /**
     * Show the workflow selection modal
     */
    showModal() {
        if (this.modalElement) {
            const modal = new window.bootstrap.Modal(this.modalElement);
            modal.show();
        }
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
            // We'll simulate fetching from server by listing workflow directories
            // In a real implementation, this would be an API call to the server
            this.workflows = [
                {
                    id: "Win11-stylized-wallpaper",
                    title: "Win11 Stylized Wallpaper",
                    description: "Generate stylized wallpapers in the Windows 11 style",
                    previewImage: "workflow/Win11-stylized-wallpaper/Win11-stylized-wallpaper.jpg"
                },
                {
                    id: "landscape-in-a-bottle",
                    title: "Landscape in a Bottle",
                    description: "Create beautiful miniature landscapes contained within glass bottles",
                    previewImage: "workflow/landscape-in-a-bottle/landscape-in-a-bottle.png"
                }
            ];
            // Sort workflows alphabetically by title
            this.workflows.sort((a, b) => a.title.localeCompare(b.title));
            this.renderWorkflows();
        }
        catch (error) {
            console.error("Error loading workflows:", error);
            this.container.innerHTML = `<div class="alert alert-danger">Failed to load workflows: ${error instanceof Error ? error.message : String(error)}</div>`;
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