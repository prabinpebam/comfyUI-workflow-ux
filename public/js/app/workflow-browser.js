/**
 * WorkflowBrowser class - Handles loading and displaying available workflows
 */
export class WorkflowBrowser {
    /**
     * Create a new WorkflowBrowser
     * @param containerElement - The element to display workflows in
     */
    constructor(containerElement) {
        this.selectedWorkflow = null;
        this.workflows = [];
        this.container = containerElement;
    }
    /**
     * Get the currently selected workflow
     */
    getSelectedWorkflow() {
        return this.selectedWorkflow;
    }
    /**
     * Load available workflows from the server
     */
    async loadWorkflows() {
        try {
            // This would typically fetch from an API endpoint that lists available workflows
            // For now, we'll just include the hardcoded Win11 example
            this.workflows = [
                {
                    title: "Win11 Stylized Wallpaper",
                    description: "Generate stylized wallpapers in the Windows 11 style",
                    previewImage: "/workflow/Win11-stylized-wallpaper/Win11-stylized-wallpaper.jpg"
                }
            ];
            this.renderWorkflows();
        }
        catch (error) {
            console.error("Error loading workflows:", error);
            this.container.innerHTML = `<div class="alert alert-danger">Failed to load workflows: ${error instanceof Error ? error.message : String(error)}</div>`;
        }
    }
    /**
     * Render the workflows in the container
     */
    renderWorkflows() {
        this.container.innerHTML = "";
        this.workflows.forEach((workflow, index) => {
            const card = document.createElement("div");
            card.classList.add("card", "mb-3", "workflow-card");
            card.innerHTML = `
        <div class="row g-0">
          <div class="col-md-4">
            <img src="${workflow.previewImage}" class="img-fluid rounded-start" alt="${workflow.title}">
          </div>
          <div class="col-md-8">
            <div class="card-body">
              <h5 class="card-title">${workflow.title}</h5>
              <p class="card-text">${workflow.description}</p>
              <button class="btn btn-primary select-workflow-btn" data-index="${index}">Select</button>
            </div>
          </div>
        </div>
      `;
            this.container.appendChild(card);
            // Add event listener to the button
            const selectBtn = card.querySelector(".select-workflow-btn");
            selectBtn.addEventListener("click", () => {
                this.selectWorkflow(index);
            });
        });
    }
    /**
     * Select a workflow by index
     */
    selectWorkflow(index) {
        if (index >= 0 && index < this.workflows.length) {
            // Highlight the selected workflow
            const cards = this.container.querySelectorAll(".workflow-card");
            cards.forEach((card, i) => {
                if (i === index) {
                    card.classList.add("selected");
                }
                else {
                    card.classList.remove("selected");
                }
            });
            // Store the selected workflow path (this would be updated for multiple workflows)
            this.selectedWorkflow = "Win11-stylized-wallpaper";
            // Trigger a custom event to notify listeners
            const event = new CustomEvent("workflowSelected", {
                detail: {
                    workflow: this.selectedWorkflow,
                    metadata: this.workflows[index]
                }
            });
            this.container.dispatchEvent(event);
        }
    }
}
//# sourceMappingURL=workflow-browser.js.map