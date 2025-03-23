export class WorkflowBrowser {
    constructor(containerElement, modalElement = null) {
        this.selectedWorkflow = null;
        this.workflows = [];
        this.modalElement = null;
        this.deleteConfirmModal = null;
        this.workflowToDelete = null;
        this.onWorkflowSelectedCallback = null;
        this.container = containerElement;
        this.modalElement = modalElement;
        const deleteModalElement = document.getElementById('deleteWorkflowModal');
        if (deleteModalElement) {
            this.deleteConfirmModal = new window.bootstrap.Modal(deleteModalElement);
            const confirmDeleteBtn = document.getElementById('confirmDeleteWorkflow');
            if (confirmDeleteBtn) {
                confirmDeleteBtn.addEventListener('click', () => this.handleDeleteConfirm());
            }
        }
    }
    getSelectedWorkflow() {
        return this.selectedWorkflow;
    }
    getSelectedWorkflowMetadata() {
        if (!this.selectedWorkflow)
            return null;
        return this.workflows.find(workflow => workflow.id === this.selectedWorkflow) || null;
    }
    setOnWorkflowSelectedCallback(callback) {
        this.onWorkflowSelectedCallback = callback;
    }
    showModal() {
        this.loadWorkflows().then(() => {
            if (this.modalElement) {
                const modal = new window.bootstrap.Modal(this.modalElement);
                modal.show();
            }
        }).catch(error => {
            console.error("Error refreshing workflows before showing modal:", error);
            if (this.modalElement) {
                const modal = new window.bootstrap.Modal(this.modalElement);
                modal.show();
            }
        });
    }
    hideModal() {
        if (this.modalElement) {
            const modal = window.bootstrap.Modal.getInstance(this.modalElement);
            if (modal) {
                modal.hide();
            }
        }
    }
    async loadWorkflows() {
        try {
            this.workflows = [];
            const manifestResponse = await fetch('workflow/manifest.json', {
                headers: { 'Cache-Control': 'no-cache' }
            });
            if (!manifestResponse.ok) {
                throw new Error('Failed to load workflows manifest');
            }
            const manifest = await manifestResponse.json();
            for (const workflow of manifest.workflows) {
                try {
                    const response = await fetch(`workflow/${workflow.path}/${workflow.path}-user-editable-parameters.json`, {
                        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache', 'Expires': '0' },
                        cache: 'no-store'
                    });
                    if (!response.ok)
                        continue;
                    const paramsJson = await response.json();
                    if (!paramsJson.workflowDetails || !paramsJson.workflowDetails.title)
                        continue;
                    const workflowTitle = String(paramsJson.workflowDetails.title);
                    this.workflows.push({
                        id: workflow.id,
                        path: workflow.path,
                        title: workflowTitle,
                        description: paramsJson.workflowDetails.description || '',
                        previewImage: `workflow/${workflow.path}/${paramsJson.workflowDetails.image || `${workflow.path}.png`}`
                    });
                }
                catch (error) {
                    console.warn(`Failed to load workflow ${workflow.path}:`, error);
                    continue;
                }
            }
            this.workflows.sort((a, b) => a.title.localeCompare(b.title));
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
    async refreshSelectedWorkflowMetadata() {
        if (!this.selectedWorkflow)
            return;
        try {
            const workflow = this.workflows.find(w => w.id === this.selectedWorkflow);
            if (!workflow)
                return;
            const response = await fetch(`workflow/${workflow.path}/${workflow.path}-user-editable-parameters.json`, {
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
            const workflowTitle = String(paramsJson.workflowDetails.title);
            const workflowIndex = this.workflows.findIndex(w => w.id === this.selectedWorkflow);
            if (workflowIndex >= 0) {
                this.workflows[workflowIndex] = {
                    id: workflow.id,
                    path: workflow.path,
                    title: workflowTitle,
                    description: paramsJson.workflowDetails.description || '',
                    previewImage: `workflow/${workflow.path}/${paramsJson.workflowDetails.image || `${workflow.path}.png`}`
                };
                if (this.onWorkflowSelectedCallback) {
                    this.onWorkflowSelectedCallback(workflow.id, this.workflows[workflowIndex]);
                }
            }
        }
        catch (error) {
            console.error(`Error refreshing metadata for workflow ${this.selectedWorkflow}:`, error);
        }
    }
    async handleDeleteConfirm() {
        var _a;
        if (!this.workflowToDelete)
            return;
        try {
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
                    errorMessage = response.statusText || `Server returned ${response.status}`;
                }
                throw new Error(errorMessage);
            }
            this.workflows = this.workflows.filter(w => w.id !== this.workflowToDelete);
            if (this.selectedWorkflow === this.workflowToDelete) {
                this.selectedWorkflow = null;
            }
            (_a = this.deleteConfirmModal) === null || _a === void 0 ? void 0 : _a.hide();
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
    confirmDelete(workflowId, workflowTitle) {
        var _a;
        this.workflowToDelete = workflowId;
        const workflowNameElement = document.getElementById('deleteWorkflowName');
        if (workflowNameElement) {
            workflowNameElement.textContent = workflowTitle;
        }
        (_a = this.deleteConfirmModal) === null || _a === void 0 ? void 0 : _a.show();
    }
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
            card.addEventListener("click", (e) => {
                if (!e.target.closest('.delete-workflow')) {
                    this.selectWorkflow(workflow.id);
                }
            });
            const deleteBtn = card.querySelector('.delete-workflow');
            if (deleteBtn) {
                deleteBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    this.confirmDelete(workflow.id, workflow.title);
                });
            }
            this.container.appendChild(card);
        });
    }
    selectWorkflow(workflowId) {
        const selectedWorkflowMetadata = this.workflows.find(workflow => workflow.id === workflowId);
        if (selectedWorkflowMetadata) {
            this.selectedWorkflow = workflowId;
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
            if (this.onWorkflowSelectedCallback) {
                this.onWorkflowSelectedCallback(workflowId, selectedWorkflowMetadata);
            }
            this.hideModal();
        }
    }
}
