# ComfyUI Workflow Manager

This project is a web-based application designed to manage and visualize workflows using ComfyUI. It provides an intuitive interface for uploading, editing, and exporting JSON configurations for workflows.

## Features

- **Upload JSON**: Easily upload your workflow JSON files.
- **Workflow Nodes Preview**: Visualize and edit your workflow nodes.
- **Drag & Drop Image**: Drag and drop images to associate with your workflows.
- **Export JSON**: Export your workflow configurations as JSON files.
- **Error Handling**: User-friendly error messages displayed in a modal.

## Getting Started

### Prerequisites

Ensure you have the following installed:

- A modern web browser (e.g., Chrome, Firefox)
- Internet connection to load external libraries

### Installation

1. Clone the repository:
    ```sh
    git clone https://github.com/yourusername/comfyui-workflow-manager.git
    ```
2. Navigate to the project directory:
    ```sh
    cd comfyui-workflow-manager
    ```

### Usage

1. Open `index.html` in your web browser.
2. Use the **Upload JSON** button to upload your workflow JSON file.
3. Edit the workflow nodes and add images as needed.
4. Click the **Export JSON** button to download the updated workflow configuration.

### File Structure

- `index.html`: Main HTML file containing the structure of the application.
- `css/`: Directory containing CSS files for styling.
- `js/`: Directory containing JavaScript files for functionality.
  - `json-visualize.js`: Script for visualizing JSON data.
  - `main.js`: Main script for handling user interactions and application logic.

### External Libraries

This project uses the following external libraries:

- [jQuery](https://jquery.com/)
- [Bootstrap](https://getbootstrap.com/)
- [Ace Editor](https://ace.c9.io/)
- [JSZip](https://stuk.github.io/jszip/)

### Contributing

Contributions are welcome! Please fork the repository and create a pull request with your changes.

### License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

### Acknowledgements

- [ComfyUI](https://comfyui.com/) for providing the workflow framework.
- [Bootstrap](https://getbootstrap.com/) for the responsive design framework.
- [Ace Editor](https://ace.c9.io/) for the code editor.

For any questions or issues, please open an issue on GitHub.

Enjoy managing your workflows with ComfyUI Workflow Manager!
