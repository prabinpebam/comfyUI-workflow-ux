import { NoiseAnimation } from '../shared/noise-animation';
import { UserEditableParameters, WorkflowMetadata } from '../shared/types';
import { ParameterEditor } from './parameter-editor.js';
import { ImageGenerator } from './image-generator.js';
import { WorkflowBrowser } from './workflow-browser.js';
import type { Modal } from '../types/bootstrap.js';

// Define bootstrap for TypeScript (consistent with workflow-browser.ts)
declare global {
  interface Window {
    bootstrap: {
      Modal: {
        new(element: Element, options?: any): Modal;
        getInstance(element: Element): Modal | null;
      }
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // Get DOM elements
  // UI control elements
  const openWorkflowButton = document.getElementById("openWorkflowButton") as HTMLButtonElement;
  const generateButton = document.getElementById("generateButton") as HTMLButtonElement;
  const workflowModal = document.getElementById("workflowSelectionModal") as HTMLElement;
  
  // Container elements
  const workflowContainer = document.getElementById("workflowContainer") as HTMLDivElement;
  const editableFieldsContainer = document.getElementById("editableFieldsContainer") as HTMLDivElement;
  const generatedImagesGrid = document.getElementById("generatedImagesGrid") as HTMLDivElement;
  
  // Status and display elements
  const progressStatus = document.getElementById("progressStatus") as HTMLDivElement;
  const elapsedTime = document.getElementById("elapsedTime") as HTMLDivElement;
  const noiseCanvas = document.getElementById("noiseCanvas") as HTMLCanvasElement;
  
  // UI state containers
  const generationInProgress = document.getElementById("generationInProgress") as HTMLElement;
  const emptyState = document.getElementById("emptyState") as HTMLElement;
  const generatedImagesContainer = document.getElementById("generatedImagesContainer") as HTMLElement;
  
  // Lightbox elements
  const lightboxElement = document.getElementById("imageLightbox") as HTMLElement;
  const lightboxImage = document.getElementById("lightboxImage") as HTMLImageElement;
  
  // Initialize the components
  const workflowBrowser = new WorkflowBrowser(workflowContainer, workflowModal);
  
  const paramEditor = new ParameterEditor(
    editableFieldsContainer, 
    progressStatus,
    generateButton
  );
  
  const imageGenerator = new ImageGenerator(
    progressStatus,
    generatedImagesGrid,
    noiseCanvas,
    elapsedTime,
    generationInProgress,
    emptyState,
    generatedImagesContainer,
    lightboxElement,
    lightboxImage
  );
  
  // Set up event listeners
  openWorkflowButton.addEventListener("click", () => {
    workflowBrowser.showModal();
  });
  
  generateButton.addEventListener("click", async () => {
    const selectedWorkflow = workflowBrowser.getSelectedWorkflow();
    const selectedMetadata = workflowBrowser.getSelectedWorkflowMetadata();
    
    if (selectedWorkflow && selectedMetadata) {
      // Get user-edited values and update workflow
      const userValues = paramEditor.getUserEditableValues();
      const workflowToGenerate = { 
        id: selectedWorkflow,
        path: selectedMetadata.path,  // Add the path from metadata
        ...paramEditor.updateWorkflowWithUserValues({})
      };
      
      // Start image generation
      await imageGenerator.generateBackground(workflowToGenerate);
    } else {
      // If no workflow selected, show an error
      progressStatus.textContent = "Please select a workflow first.";
    }
  });
  
  // Connect the workflow selection to the parameter editor
  workflowBrowser.setOnWorkflowSelectedCallback(async (workflowId: string, metadata: WorkflowMetadata) => {
    await paramEditor.setWorkflow(workflowId, metadata.title, metadata.path);
  });
  
  // Load workflows on page load and handle initial state
  workflowBrowser.loadWorkflows().then(() => {
    // If there's already a selected workflow, refresh its title and parameters
    const selectedWorkflow = workflowBrowser.getSelectedWorkflow();
    const selectedMetadata = workflowBrowser.getSelectedWorkflowMetadata();
    
    if (selectedWorkflow && selectedMetadata) {
      // This will refresh the title in the UI from the JSON file
      paramEditor.setWorkflow(selectedWorkflow, selectedMetadata.title, selectedMetadata.path);
    }
  }).catch(console.error);
});