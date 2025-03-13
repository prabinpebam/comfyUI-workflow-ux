import { ParameterEditor } from './parameter-editor.js';
import { ImageGenerator } from './image-generator.js';
document.addEventListener("DOMContentLoaded", () => {
    // If a background image is saved in local storage, use it.
    const savedBackground = localStorage.getItem("backgroundImage");
    if (savedBackground) {
        document.body.style.backgroundImage = `url(${savedBackground})`;
        document.body.style.backgroundSize = "cover";
        document.body.style.backgroundPosition = "center";
    }
    // Global variables with type annotations
    const progressDiv = document.getElementById("progress");
    const generatedGrid = document.getElementById("generatedGrid");
    const rightPane = document.getElementById("rightPane");
    const generateButton = document.getElementById("generateBackgroundButton");
    const closePaneButton = document.getElementById("closePaneButton");
    const startGenerationButton = document.getElementById("startGenerationButton");
    const noiseCanvas = document.getElementById("noiseCanvas");
    const editableFieldsContainer = document.getElementById("editableFieldsContainer");
    // Initialize the parameter editor
    const paramEditor = new ParameterEditor(editableFieldsContainer, progressDiv);
    // Initialize the image generator
    const imageGenerator = new ImageGenerator(progressDiv, generatedGrid, noiseCanvas);
    // UI control event listeners
    generateButton.addEventListener("click", () => {
        rightPane.classList.add("show");
    });
    closePaneButton.addEventListener("click", () => {
        rightPane.classList.remove("show");
    });
    startGenerationButton.addEventListener("click", () => {
        const currentWorkflow = {};
        // Get user-edited values and update workflow
        const userValues = paramEditor.getUserEditableValues();
        const updatedWorkflow = paramEditor.updateWorkflowWithUserValues(currentWorkflow);
        // Start image generation
        imageGenerator.generateBackground(updatedWorkflow);
        // Show the results section using Bootstrap 5 collapse
        const collapseElement = document.querySelector('#collapseTwo');
        if (collapseElement) {
            new bootstrap.Collapse(collapseElement, { toggle: true });
        }
    });
    // Load parameters on page load
    paramEditor.loadUserEditableParameters().catch(console.error);
});
//# sourceMappingURL=index.js.map