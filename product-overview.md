# Comfy Workflow UX

## Overview
ComfyUI is a node based workflow tool that gives detailed control over various technologies to put together a workflow. It is primarily intended to create workflows for generating images using AI. As powerful as this approach is, it requires advanced knowledge and an expert user to be able to use comfyUI effectively.

This project is an attempt at making the power of ComfyUI available for all users. The following is what the app will do.

1. An expert user can work to create a workflow that does a specific thing.
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
    2. Once a workflow is selected, the user editable parameters of the selected workflow are displayed appropriately. The user is able to change these parameters and initiate a generate command.
    3. The image is generated in the server with the given workflow and the output is presented in the UI.

## Details of Workflow selection UI
1. The workflow generation UI is a modal.
2. The modal is center aligned horizontally and vertically middle aligned.
3. The modal should have an appropriate max width.
4. The height of the modal should take up the available vieport height with proper margin around it.
5. The "Workflow items" should be presented as a list of cards.
   1. Each card should have an image thumbnail in square aspect ratio on the left that represents the workflow. The images should fill the square.
   2. The title of the workflow should be displayed.
   3. A small description of the workflow should also be presented below the title. The description can go for upto 3 lines and then it should ellipsis.
   4. The whole workflow card should be clickable to select the workflow.
   5. Detail of the workflow are to be taken from workflow-name-user-editable-parameters.json
6.  The list of the workflow should be sorted alphabetically.

## Details of the UI for editable UI parameters
1. Detail of the editable UI parameters are to be taken from workflow-name-user-editable-parameters.json
2. The editable parameters should be presented as a left pane with max width of 600px. This left pane should be independently scrollable.
3. There should be an overall sticky title bar at the top with the "workflow name" as the title. There should be a button on the right of this title bar that says "Open". Clicking this opens the modal for selecting a workflow.
4. The left pane should take up the height of the available viewport.
5. There should be a bottom sticky bar with the primary CTA button that says "Generate". This is the button that initiates the generation of image using workflows.
6. The editable parameters should be represented with the right form elements. These are already implemented in the current version of this project. Please continue to use them as is.
    1. Images are to be represented as a drag and drop area of square aspect ratio 400x400px with dashed border.
    2. Strings are to be represented with a textarea.
    3. Numbers are to be represented with a number input field.
    4. Each of this input field should have a proper label.

## Detail of the UI for presenting generated image.
1. The main body of the page is used for displaying the generated images.
2. There can be single or multiple images generated from the workflow.
3. There should be an empty state when the page is loaded for the first time with a message that says "Generate something to see a preview here."
4. When a generation start, the empty state should be replaced by the noise animation canvas which is shown in the center of the viewport as a square as pect ration of 600x600px.
5. A time counter should be displayed right below the noise animation canvas that shows the elapsed time from the moment generation is started. The time time counter should be in this format "hh:mm:ss". This counter should stop the moment the generation is completed completely. There's a possibility of false trgigger of completion as there are multiple sub steps that gets completed which can be mistaken as completion of the workflow. The whole generation needs to be completed to stop this timer. Use h3 for the time counter.
6. The status of the generation from the web socket connection should be clearly displayed just below the time counter.
7. Once the generation is complete, the noise canvas should be hidden and the generated images are to be represented as a grid array of thumbnails below the time counter and the status message.
8. Clicking on any of the images should open the images in a lightbox that covers up the full viewport with proper padding around the image.
   1. There should be a left and right navigation option that will allow the uver to move to the next or previous image, in case there are more than one image. The left and righ navigation should also work with the arrow keys.
   2. There should be a clop button at the top to close the lightbox.

# things to be deprecated from the current implementation

    


