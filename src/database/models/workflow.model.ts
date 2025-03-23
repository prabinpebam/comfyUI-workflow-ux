export interface WorkflowDocument {
  id: string;
  title: string;
  description?: string;
  created: Date;
  modified: Date;
  version: string;
  files: {
    workflow: string;      // Path to workflow JSON
    parameters: string;    // Path to parameters JSON
    preview?: string;      // Path to preview image
  };
  metadata: Record<string, any>;
}

export interface CreateWorkflowDto {
  title: string;
  description?: string;
  version: string;
  files: {
    workflow: string;
    parameters: string;
    preview?: string;
  };
  metadata?: Record<string, any>;
}