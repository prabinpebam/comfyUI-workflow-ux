# Comfy Workflow UX

## Overview
ComfyUI is a node based workflow tool that gives detailed control over various technologies to put together a workflow. It is primarily intended to create workflows for generating images using AI. As powerful as this approach is, it requires advanced knowledge and an expert user to be able to use comfyUI effectively.

This project is an attempt at making the power of ComfyUI available for all users. The following is what the app will do.

1. An exper user can work to create a workflow that does a specific thing.
2. The expert user can share the comfyUI workflow json but the UI that shows the node based workflow in ComfyUI can be very intimidating to casula users.
3. Instead, the expert can use the ComfyUI workflow converter to import the workflow-json and specify which specific parameters in the workflow should be exposed to the user in a user frinedly manner.
4. The workflow converter will convert the workflow in the following structure.

        workflow/
        └── workflow-name/
            ├── workflow-name.json //the original workflow file from comfyUI
            ├── workflow-name-user-editable-parameters.json 
            └── workflow-name.jpg //the image to represent workflow in UI

5. There can be multiple workflows in the main workflow folder.
6. All of these workflows are automatically scanned and picked up by the code and displayed as options that a user can select in the interface.
7. The app has 3 clear steps of progression.
    1. Selection of workflow
       1. A list of available workflows are displayed. The user has to select a workflow to continue.
    2. Once a workflow is selected, the user editable parameters are displayed appropriately. The user is able to change these parameters and initiate a generate command.
    3. The image is generated in the server with the given workflow and the output is presented in the UI.

    


