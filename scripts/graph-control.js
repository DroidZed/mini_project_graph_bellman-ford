document.addEventListener('DOMContentLoaded', () => {
    const graphElement = document.getElementById('graph');
    const graphContainer = document.getElementById('graph-container');
    const zoomInBtn = document.getElementById('zoom-in-btn');
    const zoomOutBtn = document.getElementById('zoom-out-btn');
    const resetBtn = document.getElementById('zoom-reset-btn');

    if (graphElement) {
        const panzoom = Panzoom(graphElement, {
            maxScale: 5,
            minScale: 0.3,
            contain: 'outside',
            excludeClass: 'node'
        });

        // Enable zooming with the mouse wheel
        graphContainer.addEventListener('wheel', panzoom.zoomWithWheel);

        // Wire up the buttons
        zoomInBtn.addEventListener('click', () => panzoom.zoomIn());
        zoomOutBtn.addEventListener('click', () => panzoom.zoomOut());
        resetBtn.addEventListener('click', () => panzoom.reset());
    }
});
