// Global variables
let graph = {
    nodes: [],
    edges: []
};
let graphSvg = null;
let currentIteration = 0;
let maxIterations = 0;
let distances = {};
let predecessors = {};
let isRunning = false;
let animationSpeed = 500;
let sourceNode = null;
let targetNode = null;
let hasNegativeCycle = false;
let draggedNode = null; // <-- ADDED: To keep track of the node being dragged

// Initialize the application
document.addEventListener('DOMContentLoaded', function () {
    initializeGraph();
    setupEventListeners();
});

function initializeGraph() {
    const graphContainer = document.getElementById('graph');
    const placeholder = document.getElementById('graph-placehoder');

    // Create SVG element
    graphSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    graphSvg.setAttribute('width', '100%');
    graphSvg.setAttribute('height', '100%');
    graphSvg.setAttribute('viewBox', '0 0 800 600');
    graphSvg.style.display = 'block';

    // Add arrow marker for directed edges
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    marker.setAttribute('id', 'arrowhead');
    marker.setAttribute('markerWidth', '10');
    marker.setAttribute('markerHeight', '7');
    marker.setAttribute('refX', '9');
    marker.setAttribute('refY', '3.5');
    marker.setAttribute('orient', 'auto');

    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    polygon.setAttribute('points', '0 0, 10 3.5, 0 7');
    polygon.setAttribute('fill', '#374151');

    marker.appendChild(polygon);
    defs.appendChild(marker);
    graphSvg.appendChild(defs);

    graphContainer.appendChild(graphSvg);
    placeholder.style.display = 'none';
}

function setupEventListeners() {
    // Graph generation button
    const generateBtn = document.querySelector('.bg-blue-600');
    generateBtn.addEventListener('click', generateRandomGraph);

    // Reset button
    const resetBtn = document.querySelector('.bg-gray-600');
    resetBtn.addEventListener('click', resetAlgorithm);

    // Speed control
    const speedSlider = document.getElementById('speed');
    speedSlider.addEventListener('input', function () {
        animationSpeed = 1100 - (parseInt(this.value) * 100);
    });

    // Source and target selection
    const sourceSelect = document.getElementById('source');
    const targetSelect = document.getElementById('target');

    sourceSelect.addEventListener('change', function () {
        sourceNode = this.value !== 'Select source...' ? this.value : null;
        updateNodeColors();
    });

    targetSelect.addEventListener('change', function () {
        targetNode = this.value !== 'Select target...' ? this.value : null;
        updateNodeColors();
    });

    // --- ADDED: Event listeners for dragging ---
    graphSvg.addEventListener('mousemove', handleMouseMove);
    graphSvg.addEventListener('mouseup', handleMouseUp);
    graphSvg.addEventListener('mouseleave', handleMouseUp); // Stop dragging if mouse leaves SVG
}

// --- ADDED: Helper to get mouse coordinates within the SVG viewBox ---
function getSVGCoordinates(event) {
    const svgRect = graphSvg.getBoundingClientRect();
    const x = event.clientX - svgRect.left;
    const y = event.clientY - svgRect.top;

    // Convert screen coordinates to SVG viewBox coordinates
    const svgX = (x / svgRect.width) * graphSvg.viewBox.baseVal.width;
    const svgY = (y / svgRect.height) * graphSvg.viewBox.baseVal.height;

    return {x: svgX, y: svgY};
}


// --- ADDED: Handlers for mouse move and mouse up events ---
function handleMouseMove(event) {
    if (!draggedNode) return; // Do nothing if not dragging
    event.preventDefault();

    const {x, y} = getSVGCoordinates(event);
    draggedNode.x = x;
    draggedNode.y = y;
    renderGraph(); // Re-render the graph with the new node position
}

function handleMouseUp() {
    draggedNode = null; // Stop dragging
    graphSvg.style.cursor = 'default'; // Reset cursor
}


function generateRandomGraph() {
    const numNodes = Math.floor(Math.random() * 4) + 5; // 5-8 nodes
    const numEdges = Math.floor(Math.random() * 6) + numNodes; // Ensure connectivity

    // Clear existing graph
    graph.nodes = [];
    graph.edges = [];

    // Generate nodes
    for (let i = 0; i < numNodes; i++) {
        const node = {
            id: String.fromCharCode(65 + i), // A, B, C, etc.
            x: 100 + Math.random() * 600,
            y: 100 + Math.random() * 400,
            distance: Infinity,
            predecessor: null,
            isSource: false,
            isTarget: false,
            isProcessing: false
        };
        graph.nodes.push(node);
    }

    // Generate edges with random weights (including negative)
    const usedEdges = new Set();

    for (let i = 0; i < numEdges; i++) {
        let fromIndex, toIndex;
        let edgeKey;

        // Ensure we don't create duplicate edges
        do {
            fromIndex = Math.floor(Math.random() * numNodes);
            toIndex = Math.floor(Math.random() * numNodes);
            edgeKey = `${fromIndex}-${toIndex}`;
        } while (fromIndex === toIndex || usedEdges.has(edgeKey));

        usedEdges.add(edgeKey);

        const weight = Math.floor(Math.random() * 21) - 10; // Weight between -10 and 10

        const edge = {
            from: graph.nodes[fromIndex].id,
            to: graph.nodes[toIndex].id,
            weight: weight,
            isProcessing: false,
            isInPath: false
        };

        graph.edges.push(edge);
    }

    // Update UI
    updateNodeSelects();
    updateStatistics();
    renderGraph();
    resetAlgorithm();
}

function updateNodeSelects() {
    const sourceSelect = document.getElementById('source');
    const targetSelect = document.getElementById('target');

    // Clear existing options
    sourceSelect.innerHTML = '<option>Select source...</option>';
    targetSelect.innerHTML = '<option>Select target...</option>';

    // Add node options
    graph.nodes.forEach(node => {
        const sourceOption = document.createElement('option');
        sourceOption.value = node.id;
        sourceOption.textContent = `Node ${node.id}`;
        sourceSelect.appendChild(sourceOption);

        const targetOption = document.createElement('option');
        targetOption.value = node.id;
        targetOption.textContent = `Node ${node.id}`;
        targetSelect.appendChild(targetOption);
    });
}

function renderGraph() {
    // Clear SVG
    while (graphSvg.firstChild && graphSvg.firstChild.tagName !== 'defs') {
        graphSvg.removeChild(graphSvg.firstChild);
    }
    while (graphSvg.children.length > 1) {
        graphSvg.removeChild(graphSvg.lastChild);
    }

    // Render edges
    graph.edges.forEach(edge => {
        renderEdge(edge);
    });

    // Render nodes
    graph.nodes.forEach(node => {
        renderNode(node);
    });
}

function renderEdge(edge) {
    const fromNode = graph.nodes.find(n => n.id === edge.from);
    const toNode = graph.nodes.find(n => n.id === edge.to);

    if (!fromNode || !toNode) return;

    // Calculate edge path (with slight curve for better visibility)
    const dx = toNode.x - fromNode.x;
    const dy = toNode.y - fromNode.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Adjust start and end points to be on circle circumference
    const radius = 25;
    const unitX = dx / distance;
    const unitY = dy / distance;

    const startX = fromNode.x + unitX * radius;
    const startY = fromNode.y + unitY * radius;
    const endX = toNode.x - unitX * radius;
    const endY = toNode.y - unitY * radius;

    // Create curved path
    const midX = (startX + endX) / 2 + (dy / distance) * 20;
    const midY = (startY + endY) / 2 - (dx / distance) * 20;

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', `M ${startX} ${startY} Q ${midX} ${midY} ${endX} ${endY}`);
    path.setAttribute('stroke', edge.isInPath ? '#ef4444' : (edge.isProcessing ? '#f59e0b' : '#374151'));
    path.setAttribute('stroke-width', edge.isInPath ? '3' : '2');
    path.setAttribute('fill', 'none');
    path.setAttribute('marker-end', 'url(#arrowhead)');

    graphSvg.appendChild(path);

    // Add weight label
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', midX);
    text.setAttribute('y', `${midY - 10}`);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('font-size', '12');
    text.setAttribute('font-weight', 'bold');
    text.setAttribute('fill', edge.weight < 0 ? '#dc2626' : '#059669');

    // Add background rectangle for better readability
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    // const bbox = text.getBBox ? text.getBBox() : { width: 20, height: 14, x: midX - 10, y: midY - 17 };

    text.textContent = edge.weight;

    rect.setAttribute('x', `${midX - 15}`);
    rect.setAttribute('y', `${midY - 18}`);
    rect.setAttribute('width', '30');
    rect.setAttribute('height', '16');
    rect.setAttribute('fill', 'white');
    rect.setAttribute('stroke', '#d1d5db');
    rect.setAttribute('rx', '3');

    graphSvg.appendChild(rect);
    graphSvg.appendChild(text);
}

function renderNode(node) {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    // --- MODIFIED: Added style and mousedown event for dragging ---
    group.style.cursor = 'grab';
    group.addEventListener('mousedown', (event) => {
        event.preventDefault();
        draggedNode = node; // Set the node to be dragged
        graphSvg.style.cursor = 'grabbing'; // Change cursor during drag
    });


    // Node circle
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', node.x);
    circle.setAttribute('cy', node.y);
    circle.setAttribute('r', '25');

    let fillColor = '#3b82f6'; // Default blue
    if (node.isSource) fillColor = '#10b981'; // Green
    else if (node.isTarget) fillColor = '#ef4444'; // Red
    else if (node.isProcessing) fillColor = '#f59e0b'; // Yellow

    circle.setAttribute('fill', fillColor);
    circle.setAttribute('stroke', '#1f2937');
    circle.setAttribute('stroke-width', '2');

    group.appendChild(circle);

    // Node label
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', node.x);
    label.setAttribute('y', node.y + 5);
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('font-size', '16');
    label.setAttribute('font-weight', 'bold');
    label.setAttribute('fill', 'white');
    label.textContent = node.id;

    group.appendChild(label);

    // Distance label
    if (distances[node.id] !== undefined) {
        const distanceText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        distanceText.setAttribute('x', node.x);
        distanceText.setAttribute('y', `${node.y - 35}`);
        distanceText.setAttribute('text-anchor', 'middle');
        distanceText.setAttribute('font-size', '12');
        distanceText.setAttribute('font-weight', 'bold');
        distanceText.setAttribute('fill', '#1f2937');

        distanceText.textContent = distances[node.id] === Infinity ? '∞' : distances[node.id];

        // Background for distance
        const distRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        distRect.setAttribute('x', `${node.x - 15}`);
        distRect.setAttribute('y', `${node.y - 45}`);
        distRect.setAttribute('width', '30');
        distRect.setAttribute('height', '16');
        distRect.setAttribute('fill', 'rgba(255, 255, 255, 0.9)');
        distRect.setAttribute('stroke', '#d1d5db');
        distRect.setAttribute('rx', '3');

        group.appendChild(distRect);
        group.appendChild(distanceText);
    }

    graphSvg.appendChild(group);
}

function updateNodeColors() {
    graph.nodes.forEach(node => {
        node.isSource = (node.id === sourceNode);
        node.isTarget = (node.id === targetNode);
    });
    renderGraph();
}

function startAlgorithm() {
    if (!sourceNode) {
        alert('Please select a source node first!');
        return;
    }

    resetAlgorithm();
    initializeBellmanFord();
    isRunning = true;
    continueAlgorithm();
}

function stopAlgorithm() {
    isRunning = false;
}

function stepAlgorithm() {
    if (!sourceNode) {
        alert('Please select a source node first!');
        return;
    }

    if (currentIteration === 0) {
        initializeBellmanFord();
    }

    performBellmanFordStep();
}

// ====================================================================
// ===== CORRECTED CODE STARTS HERE ===================================
// ====================================================================

function continueAlgorithm() {
    if (!isRunning) return;

    // The loop runs as long as we haven't completed V-1 iterations
    if (currentIteration < maxIterations) {
        performBellmanFordStep();
        setTimeout(() => {
            if (isRunning) {
                continueAlgorithm();
            }
        }, animationSpeed);
    } else {
        // Once iterations are done, we finalize everything here
        isRunning = false;
        checkForNegativeCycle();
        highlightShortestPath();
    }
}

function initializeBellmanFord() {
    distances = {};
    predecessors = {};

    graph.nodes.forEach(node => {
        distances[node.id] = node.id === sourceNode ? 0 : Infinity;
        predecessors[node.id] = null;
        node.distance = distances[node.id];
        node.isProcessing = false;
    });

    currentIteration = 0;
    maxIterations = graph.nodes.length - 1;
    hasNegativeCycle = false;

    updateStatistics();
    renderGraph();
}

function performBellmanFordStep() {
    // This function now ONLY performs one step of the relaxation process.
    // It no longer contains logic for finishing the algorithm.
    let updated = false;

    graph.edges.forEach(edge => {
        edge.isProcessing = true;

        const u = edge.from;
        const v = edge.to;
        const weight = edge.weight;

        if (distances[u] !== Infinity && distances[u] + weight < distances[v]) {
            distances[v] = distances[u] + weight;
            predecessors[v] = u;
            updated = true;

            // Update node distance
            const node = graph.nodes.find(n => n.id === v);
            if (node) {
                node.distance = distances[v];
            }
        }
    });

    currentIteration++;

    // Reset edge processing state after a delay for visualization
    setTimeout(() => {
        graph.edges.forEach(edge => {
            edge.isProcessing = false;
        });
        renderGraph();
    }, animationSpeed / 2);

    updateStatistics();
    renderGraph();
}

// ====================================================================
// ===== CORRECTED CODE ENDS HERE =====================================
// ====================================================================

function checkForNegativeCycle() {
    graph.edges.forEach(edge => {
        const u = edge.from;
        const v = edge.to;
        const weight = edge.weight;

        if (distances[u] !== Infinity && distances[u] + weight < distances[v]) {
            hasNegativeCycle = true;
        }
    });

    updateStatistics();
}

function highlightShortestPath() {
    // Return if no target is selected by the user
    if (!targetNode) return;

    // Check for a negative cycle first
    if (hasNegativeCycle) {
        Swal.fire({
            icon: 'error',
            title: 'Negative Weight Cycle Detected!',
            text: 'A valid shortest path cannot be determined because the graph contains a negative cycle.',
        });
        return; // Stop execution
    }

    // Check if the target is unreachable
    if (distances[targetNode] === Infinity) {
        Swal.fire({
            icon: 'warning',
            title: 'Path Not Found',
            text: `The target node ${targetNode} is not reachable from the source node ${sourceNode}.`,
        });
        return; // Stop execution
    }

    // --- If we reach here, a valid path was found ---

    // Clear previous path highlighting
    graph.edges.forEach(edge => {
        edge.isInPath = false;
    });

    // Trace back the shortest path
    let current = targetNode;
    while (current && predecessors[current] !== null) {
        const prev = predecessors[current];
        const edge = graph.edges.find(e => e.from === prev && e.to === current);
        if (edge) {
            edge.isInPath = true;
        }
        current = prev;
    }

    renderGraph();
}

function resetAlgorithm() {
    isRunning = false;
    currentIteration = 0;
    maxIterations = 0;
    distances = {};
    predecessors = {};
    hasNegativeCycle = false;

    graph.nodes.forEach(node => {
        node.distance = Infinity;
        node.isProcessing = false;
    });

    graph.edges.forEach(edge => {
        edge.isProcessing = false;
        edge.isInPath = false;
    });

    updateStatistics();
    renderGraph();
}

function updateStatistics() {
    // Update iteration display
    const iterationElement = document.querySelector('.text-blue-600');
    if (iterationElement) {
        iterationElement.textContent = `${currentIteration} / ${maxIterations}`;
    }

    // Update nodes count
    const nodesElements = document.querySelectorAll('.text-sm.font-semibold');
    if (nodesElements[0]) {
        nodesElements[0].textContent = graph.nodes.length;
    }

    // Update edges count
    if (nodesElements[1]) {
        nodesElements[1].textContent = graph.edges.length;
    }

    // Update shortest path length
    const pathLengthElement = document.querySelector('.text-purple-600');
    if (pathLengthElement && targetNode && distances[targetNode] !== undefined) {
        pathLengthElement.textContent = distances[targetNode] === Infinity ? 'N/A' : distances[targetNode];
    } else if (pathLengthElement) {
        pathLengthElement.textContent = 'N/A';
    }


    // Update negative cycle detection
    const negativeCycleElement = document.querySelector('.text-red-600');
    if (negativeCycleElement) {
        negativeCycleElement.textContent = hasNegativeCycle ? 'Detected' : 'Not Detected';
    }

    // Update execution time (simulated)
    const timeElement = document.querySelector('.text-green-600');
    if (timeElement) {
        const simulatedTime = (currentIteration * 0.05).toFixed(2);
        timeElement.textContent = `${simulatedTime} ms`;
    }
}

// Generate initial graph on page load
setTimeout(() => {
    const graphContainer = document.getElementById('graph');
    graphContainer.classList.remove('hidden');

    generateRandomGraph();
}, 100);
