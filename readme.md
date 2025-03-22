# Comfyui Workflow UX

This project is a web application that allows users to generate and set custom background images using ComfyUI workflows. The application provides a user-friendly interface for customizing workflow parameters, generating stylized images, and managing the generation process.

## Features

- **Workflow Selection**: Browse and select from multiple available workflows with preview images
- **Parameter Customization**: User-friendly interface for editing workflow parameters including images, numbers, and text inputs
- **Live Generation Progress**: Real-time progress tracking with elapsed time counter and animated noise background
- **Image Preview**: Grid view of generated images with lightbox support for detailed viewing
- **Image Interaction**: Zoom and pan functionality in the lightbox view for detailed image inspection
- **Responsive Design**: Bootstrap-based responsive interface that works across different screen sizes
- **Workflow Management**: Tools for converting and managing ComfyUI workflows with user-editable parameters

## Technologies Used

- **TypeScript**: Type-safe implementation of the application logic
- **Bootstrap 5**: Responsive design and UI components
- **WebGL**: Advanced visual effects for the noise animation background
- **WebSocket**: Real-time communication with the ComfyUI server
- **Modular Architecture**: Clean separation of concerns with specialized classes
  - Parameter Editor: Handles workflow parameter UI and validation
  - Image Generator: Coordinates the image generation process
  - Workflow Browser: Manages workflow selection and metadata
  - UI State Manager: Controls application state transitions
  - Lightbox Manager: Handles image preview and interaction
  - API Client: Manages communication with the ComfyUI server

## Project Structure

### Source Code (`/src`)
- `/app`: Core application logic
  - `api-client.ts`: ComfyUI server communication
  - `image-generator.ts`: Image generation coordination
  - `lightbox-manager.ts`: Image preview functionality
  - `parameter-editor.ts`: Workflow parameter management
  - `ui-state-manager.ts`: Application state control
  - `workflow-browser.ts`: Workflow selection interface
- `/shared`: Shared utilities and types
  - `image-utility.ts`: Image processing utilities
  - `noise-animation.ts`: Background animation effects
  - `types.ts`: TypeScript type definitions
  - `utils.ts`: General utility functions

### Web Assets (`/docs`)
- `/js`: Compiled JavaScript output
- `/css`: Stylesheets
- `/lib`: Third-party libraries
- `/workflow`: ComfyUI workflow definitions and parameters

### Build Configuration
- `tsconfig.json`: TypeScript compiler settings
- `package.json`: Project dependencies and scripts

## Development

The project uses Node.js and npm for development. Key npm scripts:
- `npm run build`: Compile TypeScript code
- `npm run watch`: Watch for changes and recompile
- `npm run serve`: Start a development server
- `npm run dev`: Run watch and serve in parallel
