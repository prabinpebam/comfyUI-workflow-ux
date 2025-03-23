import { NoiseAnimation } from '../shared/noise-animation.js';
export class UIStateManager {
    constructor(statusElement, noiseCanvas, elapsedTimeElement, generationInProgressElement, emptyStateElement, generatedImagesContainer) {
        this.timerInterval = null;
        this.startTime = 0;
        this.workflowCompleted = false;
        if (!statusElement)
            throw new Error("Status element is required");
        if (!noiseCanvas)
            throw new Error("Noise canvas element is required");
        if (!elapsedTimeElement)
            throw new Error("Elapsed time element is required");
        if (!generationInProgressElement)
            throw new Error("Generation in progress element is required");
        if (!emptyStateElement)
            throw new Error("Empty state element is required");
        if (!generatedImagesContainer)
            throw new Error("Generated images container element is required");
        this.statusElement = statusElement;
        this.elapsedTimeElement = elapsedTimeElement;
        this.generationInProgressElement = generationInProgressElement;
        this.emptyStateElement = emptyStateElement;
        this.generatedImagesContainer = generatedImagesContainer;
        this.noiseAnim = new NoiseAnimation(noiseCanvas);
        this.noiseAnim.stop();
        this.showEmptyState();
    }
    showEmptyState() {
        if (!this.emptyStateElement || !this.generatedImagesContainer || !this.generationInProgressElement) {
            console.error('Required DOM elements not found for UI state management');
            return;
        }
        this.stopTimer();
        this.noiseAnim.stop();
        this.generationInProgressElement.classList.add('d-none');
        this.generationInProgressElement.classList.remove('d-flex');
        this.generatedImagesContainer.style.display = 'none';
        this.emptyStateElement.classList.remove('d-none');
        this.emptyStateElement.classList.add('d-flex');
    }
    showGenerationInProgress() {
        if (!this.emptyStateElement || !this.generatedImagesContainer || !this.generationInProgressElement) {
            console.error('Required DOM elements not found for UI state management');
            return;
        }
        this.workflowCompleted = false;
        this.emptyStateElement.classList.add('d-none');
        this.emptyStateElement.classList.remove('d-flex');
        this.generatedImagesContainer.style.display = 'none';
        this.generationInProgressElement.classList.remove('d-none');
        this.generationInProgressElement.classList.add('d-flex');
        this.noiseAnim.start();
        this.startTimer();
    }
    showGeneratedImages() {
        if (!this.emptyStateElement || !this.generatedImagesContainer || !this.generationInProgressElement) {
            console.error('Required DOM elements not found for UI state management');
            return;
        }
        this.emptyStateElement.classList.add('d-none');
        this.emptyStateElement.classList.remove('d-flex');
        this.generationInProgressElement.classList.add('d-none');
        this.generationInProgressElement.classList.remove('d-flex');
        this.generatedImagesContainer.style.display = 'block';
        this.workflowCompleted = true;
        this.noiseAnim.stop();
        this.stopTimer();
    }
    updateStatus(message) {
        this.statusElement.textContent = message;
    }
    startTimer() {
        this.workflowCompleted = false;
        this.startTime = Date.now();
        this.updateElapsedTime();
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        this.timerInterval = window.setInterval(() => {
            this.updateElapsedTime();
        }, 1000);
    }
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        this.updateElapsedTime();
    }
    updateElapsedTime() {
        const elapsedMs = Date.now() - this.startTime;
        const elapsedSec = Math.floor(elapsedMs / 1000);
        const hours = Math.floor(elapsedSec / 3600);
        const minutes = Math.floor((elapsedSec % 3600) / 60);
        const seconds = elapsedSec % 60;
        const timeString = String(hours).padStart(2, '0') + ':' +
            String(minutes).padStart(2, '0') + ':' +
            String(seconds).padStart(2, '0');
        this.elapsedTimeElement.textContent = timeString;
    }
    isWorkflowCompleted() {
        return this.workflowCompleted;
    }
}
