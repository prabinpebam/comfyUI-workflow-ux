// Type declarations for Bootstrap 5 components used in the project
declare class Collapse {
    constructor(element: Element, options?: { toggle?: boolean });
    show(): void;
    hide(): void;
    toggle(): void;
    dispose(): void;
}

export { Collapse };