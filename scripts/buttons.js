function toggleInfoButtons() {
    const infoButtons = document.getElementById('info-buttons');
    const isVisible = infoButtons.classList.contains('opacity-100');

    if (isVisible) {
        infoButtons.classList.remove('opacity-100', 'scale-100', 'pointer-events-auto');
        infoButtons.classList.add('opacity-0', 'scale-95', 'pointer-events-none');
    } else {
        infoButtons.classList.remove('opacity-0', 'scale-95', 'pointer-events-none');
        infoButtons.classList.add('opacity-100', 'scale-100', 'pointer-events-auto');
    }
}
