import { GeneratedImageInfo } from '../shared/types';

interface ImageDimensions {
  width: number;
  height: number;
}

export class LightboxManager {
  private lightboxElement: HTMLElement;
  private lightboxImage: HTMLImageElement;
  private currentLightboxIndex: number = 0;
  private generatedImages: GeneratedImageInfo[] = [];
  
  // Zoom and pan state
  private currentZoom: number = 1;
  private panPosition = { x: 0, y: 0 };
  private isDragging: boolean = false;
  private dragStart = { x: 0, y: 0 };
  private imageNaturalSize: ImageDimensions = { width: 0, height: 0 };

  constructor(
    lightboxElement: HTMLElement,
    lightboxImage: HTMLImageElement
  ) {
    if (!lightboxElement) throw new Error("Lightbox element is required");
    if (!lightboxImage) throw new Error("Lightbox image element is required");
    
    this.lightboxElement = lightboxElement;
    this.lightboxImage = lightboxImage;
    this.setupLightbox();
  }

  setImages(images: GeneratedImageInfo[]): void {
    this.generatedImages = images;
  }

  private setupLightbox(): void {
    // Navigation controls
    const closeLightbox = document.getElementById('closeLightbox');
    if (closeLightbox) {
      closeLightbox.addEventListener('click', () => this.hide());
    }
    
    const prevImage = document.getElementById('prevImage');
    if (prevImage) {
      prevImage.addEventListener('click', () => this.showPrevImage());
    }
    
    const nextImage = document.getElementById('nextImage');
    if (nextImage) {
      nextImage.addEventListener('click', () => this.showNextImage());
    }
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (this.lightboxElement.style.display !== 'none') {
        if (e.key === 'Escape') {
          this.hide();
        } else if (e.key === 'ArrowLeft') {
          this.showPrevImage();
        } else if (e.key === 'ArrowRight') {
          this.showNextImage();
        }
      }
    });

    // Set up zoom and pan
    this.setupZoomAndPan();
  }

  private setupZoomAndPan(): void {
    // Image load handler
    this.lightboxImage.addEventListener('load', () => {
      this.imageNaturalSize = {
        width: this.lightboxImage.naturalWidth,
        height: this.lightboxImage.naturalHeight
      };
      this.resetZoomAndPan();
    });

    // Mouse wheel zoom
    this.lightboxImage.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomChange = e.deltaY < 0 ? 1.1 : 0.9;
      
      // Get mouse position relative to image
      const rect = this.lightboxImage.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      // Calculate new zoom with constraints
      const newZoom = Math.min(Math.max(this.currentZoom * zoomChange, 0.1), 4);
      
      // Calculate pan adjustment to keep point under cursor
      const panAdjustX = (mouseX - rect.width / 2) * (1 - zoomChange);
      const panAdjustY = (mouseY - rect.height / 2) * (1 - zoomChange);
      
      // Update zoom and pan
      this.currentZoom = newZoom;
      this.applyZoomTransform();
      this.applyPanAdjustment(panAdjustX, panAdjustY);
    });

    // Mouse drag for panning
    this.lightboxImage.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.isDragging = true;
      this.dragStart = { x: e.clientX, y: e.clientY };
      this.lightboxImage.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
      if (this.isDragging && this.lightboxElement.style.display !== 'none') {
        e.preventDefault();
        const dx = e.clientX - this.dragStart.x;
        const dy = e.clientY - this.dragStart.y;
        
        this.dragStart = { x: e.clientX, y: e.clientY };
        this.applyPanAdjustment(dx, dy);
      }
    });

    document.addEventListener('mouseup', () => {
      if (this.isDragging) {
        this.isDragging = false;
        this.lightboxImage.style.cursor = 'grab';
      }
    });
  }

  private applyZoomTransform(): void {
    const transform = `scale(${this.currentZoom}) translate(${this.panPosition.x / this.currentZoom}px, ${this.panPosition.y / this.currentZoom}px)`;
    this.lightboxImage.style.transform = transform;
  }

  private applyPanAdjustment(dx: number, dy: number): void {
    const containerRect = this.lightboxElement.getBoundingClientRect();
    const imageRect = this.lightboxImage.getBoundingClientRect();
    
    // Calculate the center point of the viewport
    const viewportCenterX = containerRect.width / 2;
    const viewportCenterY = containerRect.height / 2;

    // Calculate proposed new position
    const newX = this.panPosition.x + dx;
    const newY = this.panPosition.y + dy;

    // Calculate image edges after the proposed move
    const leftEdge = viewportCenterX - (imageRect.width / 2) + newX;
    const rightEdge = viewportCenterX + (imageRect.width / 2) + newX;
    const topEdge = viewportCenterY - (imageRect.height / 2) + newY;
    const bottomEdge = viewportCenterY + (imageRect.height / 2) + newY;

    // Calculate limit adjustments to prevent edges from crossing center
    let finalX = newX;
    let finalY = newY;

    // Handle horizontal movement
    if (leftEdge > viewportCenterX) {
      finalX = (imageRect.width / 2);
    } else if (rightEdge < viewportCenterX) {
      finalX = -(imageRect.width / 2);
    }

    // Handle vertical movement
    if (topEdge > viewportCenterY) {
      finalY = (imageRect.height / 2);
    } else if (bottomEdge < viewportCenterY) {
      finalY = -(imageRect.height / 2);
    }

    // Update position only if we're moving in that direction and haven't hit the limit
    if ((dx > 0 && newX <= finalX) || (dx < 0 && newX >= finalX)) {
      this.panPosition.x = newX;
    } else {
      this.panPosition.x = finalX;
    }

    if ((dy > 0 && newY <= finalY) || (dy < 0 && newY >= finalY)) {
      this.panPosition.y = newY;
    } else {
      this.panPosition.y = finalY;
    }
    
    // Apply the transform
    this.applyZoomTransform();
  }

  private resetZoomAndPan(): void {
    this.currentZoom = 1;
    this.panPosition = { x: 0, y: 0 };
    this.applyZoomTransform();
  }

  show(imageIndex: number): void {
    if (imageIndex >= 0 && imageIndex < this.generatedImages.length && this.generatedImages[imageIndex].base64) {
      this.currentLightboxIndex = imageIndex;
      this.lightboxImage.src = this.generatedImages[imageIndex].base64 || '';
      this.lightboxElement.style.display = 'flex';
      
      const prevButton = document.getElementById('prevImage');
      const nextButton = document.getElementById('nextImage');
      
      if (prevButton && nextButton) {
        if (this.generatedImages.length <= 1) {
          prevButton.style.display = 'none';
          nextButton.style.display = 'none';
        } else {
          prevButton.style.display = 'flex';
          nextButton.style.display = 'flex';
        }
      }
    }
  }

  hide(): void {
    this.lightboxElement.style.display = 'none';
  }

  private showPrevImage(): void {
    if (this.generatedImages.length <= 1) return;
    
    this.currentLightboxIndex--;
    if (this.currentLightboxIndex < 0) {
      this.currentLightboxIndex = this.generatedImages.length - 1;
    }
    
    if (this.generatedImages[this.currentLightboxIndex].base64) {
      this.lightboxImage.src = this.generatedImages[this.currentLightboxIndex].base64 || '';
      this.resetZoomAndPan();
    }
  }

  private showNextImage(): void {
    if (this.generatedImages.length <= 1) return;
    
    this.currentLightboxIndex++;
    if (this.currentLightboxIndex >= this.generatedImages.length) {
      this.currentLightboxIndex = 0;
    }
    
    if (this.generatedImages[this.currentLightboxIndex].base64) {
      this.lightboxImage.src = this.generatedImages[this.currentLightboxIndex].base64 || '';
      this.resetZoomAndPan();
    }
  }
}