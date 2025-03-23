import { ParameterEditor } from './parameter-editor.js';
import { ImageGenerator } from './image-generator.js';
import { WorkflowBrowser } from './workflow-browser.js';
document.addEventListener("DOMContentLoaded", () => {
    const openWorkflowButton = document.getElementById("openWorkflowButton");
    const generateButton = document.getElementById("generateButton");
    const workflowModal = document.getElementById("workflowSelectionModal");
    const workflowContainer = document.getElementById("workflowContainer");
    const editableFieldsContainer = document.getElementById("editableFieldsContainer");
    const generatedImagesGrid = document.getElementById("generatedImagesGrid");
    const progressStatus = document.getElementById("progressStatus");
    const elapsedTime = document.getElementById("elapsedTime");
    const noiseCanvas = document.getElementById("noiseCanvas");
    const generationInProgress = document.getElementById("generationInProgress");
    const emptyState = document.getElementById("emptyState");
    const generatedImagesContainer = document.getElementById("generatedImagesContainer");
    const lightboxElement = document.getElementById("imageLightbox");
    const lightboxImage = document.getElementById("lightboxImage");
    const workflowBrowser = new WorkflowBrowser(workflowContainer, workflowModal);
    const paramEditor = new ParameterEditor(editableFieldsContainer, progressStatus, generateButton);
    const imageGenerator = new ImageGenerator(progressStatus, generatedImagesGrid, noiseCanvas, elapsedTime, generationInProgress, emptyState, generatedImagesContainer, lightboxElement, lightboxImage);
    openWorkflowButton.addEventListener("click", () => {
        workflowBrowser.showModal();
    });
    generateButton.addEventListener("click", async () => {
        const selectedWorkflow = workflowBrowser.getSelectedWorkflow();
        const selectedMetadata = workflowBrowser.getSelectedWorkflowMetadata();
        if (selectedWorkflow && selectedMetadata) {
            const userValues = paramEditor.getUserEditableValues();
            const workflowToGenerate = {
                id: selectedWorkflow,
                path: selectedMetadata.path,
                ...paramEditor.updateWorkflowWithUserValues({})
            };
            await imageGenerator.generateBackground(workflowToGenerate);
        }
        else {
            progressStatus.textContent = "Please select a workflow first.";
        }
    });
    workflowBrowser.setOnWorkflowSelectedCallback(async (workflowId, metadata) => {
        await paramEditor.setWorkflow(workflowId, metadata.title, metadata.path);
    });
    workflowBrowser.loadWorkflows().then(() => {
        const selectedWorkflow = workflowBrowser.getSelectedWorkflow();
        const selectedMetadata = workflowBrowser.getSelectedWorkflowMetadata();
        if (selectedWorkflow && selectedMetadata) {
            paramEditor.setWorkflow(selectedWorkflow, selectedMetadata.title, selectedMetadata.path);
        }
    }).catch(console.error);
});
