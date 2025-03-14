/**
 * Type definitions for Bootstrap 5
 */

// Modal component type
export interface Modal {
  show(): void;
  hide(): void;
  toggle(): void;
  handleUpdate(): void;
  dispose(): void;
}

// Collapse component type
export interface Collapse {
  show(): void;
  hide(): void;
  toggle(): void;
  dispose(): void;
}

// Toast component type
export interface Toast {
  show(): void;
  hide(): void;
  dispose(): void;
}

// Tooltip component type
export interface Tooltip {
  show(): void;
  hide(): void;
  toggle(): void;
  update(): void;
  dispose(): void;
}

// Popover component type
export interface Popover {
  show(): void;
  hide(): void;
  toggle(): void;
  update(): void;
  dispose(): void;
}