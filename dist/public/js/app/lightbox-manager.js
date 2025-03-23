export class LightboxManager {
    constructor(lightboxElement, lightboxImage) {
        this.currentLightboxIndex = 0;
        this.generatedImages = [];
        this.currentZoom = 1;
        this.panPosition = { x: 0, y: 0 };
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.imageNaturalSize = { width: 0, height: 0 };
        if (!lightboxElement)
            throw new Error("Lightbox element is required");
        if (!lightboxImage)
            throw new Error("Lightbox image element is required");
        this.lightboxElement = lightboxElement;
        this.lightboxImage = lightboxImage;
        this.setupLightbox();
    }
    setImages(images) {
        this.generatedImages = images;
    }
    setupLightbox() {
        const closeLightbox = document.getElementById('closeLightbox');
        if (closeLightbox) {
            closeLightbox.addEventListener('click', () => this.hide());
        }
        const prevImage = document.getElementById('prevImage');
        if (prevImage) {
            prevImage.innerHTML = '<i class="bi bi-chevron-left"></i>';
            prevImage.addEventListener('click', () => this.showPrevImage());
        }
        const nextImage = document.getElementById('nextImage');
        if (nextImage) {
            nextImage.innerHTML = '<i class="bi bi-chevron-right"></i>';
            nextImage.addEventListener('click', () => this.showNextImage());
        }
        document.addEventListener('keydown', (e) => {
            if (this.lightboxElement.style.display !== 'none') {
                if (e.key === 'Escape') {
                    this.hide();
                }
                else if (e.key === 'ArrowLeft') {
                    this.showPrevImage();
                }
                else if (e.key === 'ArrowRight') {
                    this.showNextImage();
                }
            }
        });
        this.setupZoomAndPan();
    }
    setupZoomAndPan() {
        this.lightboxImage.addEventListener('load', () => {
            this.imageNaturalSize = {
                width: this.lightboxImage.naturalWidth,
                height: this.lightboxImage.naturalHeight
            };
            this.resetZoomAndPan();
        });
        this.lightboxImage.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomChange = e.deltaY < 0 ? 1.1 : 0.9;
            const rect = this.lightboxImage.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            const newZoom = Math.min(Math.max(this.currentZoom * zoomChange, 0.1), 4);
            const panAdjustX = (mouseX - rect.width / 2) * (1 - zoomChange);
            const panAdjustY = (mouseY - rect.height / 2) * (1 - zoomChange);
            this.currentZoom = newZoom;
            this.applyZoomTransform();
            this.applyPanAdjustment(panAdjustX, panAdjustY);
        });
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
    applyZoomTransform() {
        const transform = `scale(${this.currentZoom}) translate(${this.panPosition.x / this.currentZoom}px, ${this.panPosition.y / this.currentZoom}px)`;
        this.lightboxImage.style.transform = transform;
    }
    applyPanAdjustment(dx, dy) {
        const containerRect = this.lightboxElement.getBoundingClientRect();
        const imageRect = this.lightboxImage.getBoundingClientRect();
        const viewportCenterX = containerRect.width / 2;
        const viewportCenterY = containerRect.height / 2;
        const newX = this.panPosition.x + dx;
        const newY = this.panPosition.y + dy;
        const leftEdge = viewportCenterX - (imageRect.width / 2) + newX;
        const rightEdge = viewportCenterX + (imageRect.width / 2) + newX;
        const topEdge = viewportCenterY - (imageRect.height / 2) + newY;
        const bottomEdge = viewportCenterY + (imageRect.height / 2) + newY;
        let finalX = newX;
        let finalY = newY;
        if (leftEdge > viewportCenterX) {
            finalX = (imageRect.width / 2);
        }
        else if (rightEdge < viewportCenterX) {
            finalX = -(imageRect.width / 2);
        }
        if (topEdge > viewportCenterY) {
            finalY = (imageRect.height / 2);
        }
        else if (bottomEdge < viewportCenterY) {
            finalY = -(imageRect.height / 2);
        }
        if ((dx > 0 && newX <= finalX) || (dx < 0 && newX >= finalX)) {
            this.panPosition.x = newX;
        }
        else {
            this.panPosition.x = finalX;
        }
        if ((dy > 0 && newY <= finalY) || (dy < 0 && newY >= finalY)) {
            this.panPosition.y = newY;
        }
        else {
            this.panPosition.y = finalY;
        }
        this.applyZoomTransform();
    }
    resetZoomAndPan() {
        this.currentZoom = 1;
        this.panPosition = { x: 0, y: 0 };
        this.applyZoomTransform();
    }
    show(imageIndex) {
        if (imageIndex >= 0 && imageIndex < this.generatedImages.length && this.generatedImages[imageIndex].base64) {
            this.currentLightboxIndex = imageIndex;
            this.lightboxImage.src = this.generatedImages[imageIndex].base64 || '';
            this.lightboxElement.style.display = 'flex';
            const prevButton = document.getElementById('prevImage');
            const nextButton = document.getElementById('nextImage');
            if (prevButton && nextButton) {
                const shouldShowNavigation = this.generatedImages.length > 1;
                prevButton.style.display = shouldShowNavigation ? 'flex' : 'none';
                nextButton.style.display = shouldShowNavigation ? 'flex' : 'none';
            }
        }
    }
    hide() {
        this.lightboxElement.style.display = 'none';
    }
    showPrevImage() {
        if (this.generatedImages.length <= 1)
            return;
        this.currentLightboxIndex--;
        if (this.currentLightboxIndex < 0) {
            this.currentLightboxIndex = this.generatedImages.length - 1;
        }
        if (this.generatedImages[this.currentLightboxIndex].base64) {
            this.lightboxImage.src = this.generatedImages[this.currentLightboxIndex].base64 || '';
            this.resetZoomAndPan();
        }
    }
    showNextImage() {
        if (this.generatedImages.length <= 1)
            return;
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
