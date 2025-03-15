import { ParameterEditor } from './parameter-editor.js';
import { ImageGenerator } from './image-generator.js';
import { WorkflowBrowser } from './workflow-browser.js';
document.addEventListener("DOMContentLoaded", () => {
    // Get DOM elements
    // UI control elements
    const openWorkflowButton = document.getElementById("openWorkflowButton");
    const generateButton = document.getElementById("generateButton");
    const workflowModal = document.getElementById("workflowSelectionModal");
    // Container elements
    const workflowContainer = document.getElementById("workflowContainer");
    const editableFieldsContainer = document.getElementById("editableFieldsContainer");
    const generatedImagesGrid = document.getElementById("generatedImagesGrid");
    // Status and display elements
    const progressStatus = document.getElementById("progressStatus");
    const elapsedTime = document.getElementById("elapsedTime");
    const noiseCanvas = document.getElementById("noiseCanvas");
    // UI state containers
    const generationInProgress = document.getElementById("generationInProgress");
    const emptyState = document.getElementById("emptyState");
    const generatedImagesContainer = document.getElementById("generatedImagesContainer");
    // Lightbox elements
    const lightboxElement = document.getElementById("imageLightbox");
    const lightboxImage = document.getElementById("lightboxImage");
    // Initialize the components
    const workflowBrowser = new WorkflowBrowser(workflowContainer, workflowModal);
    const paramEditor = new ParameterEditor(editableFieldsContainer, progressStatus, generateButton);
    const imageGenerator = new ImageGenerator(progressStatus, generatedImagesGrid, noiseCanvas, elapsedTime, generationInProgress, emptyState, generatedImagesContainer, lightboxElement, lightboxImage);
    // Set up event listeners
    openWorkflowButton.addEventListener("click", () => {
        workflowBrowser.showModal();
    });
    generateButton.addEventListener("click", async () => {
        const selectedWorkflow = workflowBrowser.getSelectedWorkflow();
        if (selectedWorkflow) {
            // Get user-edited values and update workflow
            const userValues = paramEditor.getUserEditableValues();
            const workflowToGenerate = {
                id: selectedWorkflow,
                ...paramEditor.updateWorkflowWithUserValues({})
            };
            // Start image generation
            await imageGenerator.generateBackground(workflowToGenerate);
        }
        else {
            // If no workflow selected, show an error
            progressStatus.textContent = "Please select a workflow first.";
        }
    });
    // Connect the workflow selection to the parameter editor
    workflowBrowser.setOnWorkflowSelectedCallback(async (workflowId, metadata) => {
        await paramEditor.setWorkflow(workflowId, metadata.title);
    });
    // Load workflows on page load and handle initial state
    workflowBrowser.loadWorkflows().then(() => {
        // If there's already a selected workflow, refresh its title and parameters
        const selectedWorkflow = workflowBrowser.getSelectedWorkflow();
        const selectedMetadata = workflowBrowser.getSelectedWorkflowMetadata();
        if (selectedWorkflow && selectedMetadata) {
            // This will refresh the title in the UI from the JSON file
            paramEditor.setWorkflow(selectedWorkflow, selectedMetadata.title);
        }
    }).catch(console.error);
});
//# sourceMappingURL=index.js.map