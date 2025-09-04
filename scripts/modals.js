// Modal animation handlers
document.querySelectorAll('dialog').forEach(modal => {
    modal.addEventListener('show', () => {
        modal.classList.remove('opacity-0', 'scale-95');
        modal.classList.add('opacity-100', 'scale-100');
    });

    modal.addEventListener('close', () => {
        modal.classList.remove('opacity-100', 'scale-100');
        modal.classList.add('opacity-0', 'scale-95');
    });
});


// Override showModal to add animations
const originalShowModal = HTMLDialogElement.prototype.showModal;
HTMLDialogElement.prototype.showModal = function () {
    originalShowModal.call(this);
    setTimeout(() => {
        this.classList.remove('opacity-0', 'scale-95');
        this.classList.add('opacity-100', 'scale-100');
    }, 10);
};

// Override close to add animations
const originalClose = HTMLDialogElement.prototype.close;
HTMLDialogElement.prototype.close = function () {
    this.classList.remove('opacity-100', 'scale-100');
    this.classList.add('opacity-0', 'scale-95');
    setTimeout(() => {
        originalClose.call(this);
    }, 300);
};
