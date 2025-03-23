// Interface for workflow metadata
export interface WorkflowMetadata {
  id: string;
  path: string;
  title: string;
  description: string;
  previewImage: string;
}

// Interface for editable parameter definition
export interface EditableParameter {
  label: string;
  selectedType: 'Number' | 'Text' | 'String' | 'Image';
  value: string | number;
  min?: number;
  max?: number;
}

// Interface for node parameters
export interface NodeParameters {
  title?: string;
  inputs: {
    [key: string]: EditableParameter;
  };
}

// Interface for user editable parameters file structure
export interface UserEditableParameters {
  [nodeId: string]: NodeParameters;
}

// Interface for ComfyUI workflow node
export interface WorkflowNode {
  class_type: string;
  inputs: {
    [key: string]: any;
  };
}

// Interface for full ComfyUI workflow
export interface Workflow {
  id?: string;
  [nodeId: string]: WorkflowNode | string | undefined;
}

// Interface for generated image information
export interface GeneratedImageInfo {
  filename: string;
  subfolder: string;
  type: string;
  base64?: string;
}