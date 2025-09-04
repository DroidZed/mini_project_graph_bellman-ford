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
let draggedNode = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function () {
    initializeGraph();
    setupEventListeners();
    generateRandomGraph(); // Generate a graph on load
});

function initializeGraph() {
    const graphContainer = document.getElementById('graph');
    graphSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    graphSvg.setAttribute('width', '100%');
    graphSvg.setAttribute('height', '100%');
    graphSvg.setAttribute('viewBox', '0 0 800 600');
    graphSvg.style.display = 'block';

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
}

function setupEventListeners() {
    const speedSlider = document.getElementById('speed');
    speedSlider.addEventListener('input', function () {
        animationSpeed = 1100 - (parseInt(this.value) * 100);
    });

    const sourceSelect = document.getElementById('source');
    sourceSelect.addEventListener('change', function () {
        sourceNode = this.value !== 'Select source...' ? this.value : null;
        updateNodeColors();
    });

    const targetSelect = document.getElementById('target');
    targetSelect.addEventListener('change', function () {
        targetNode = this.value !== 'Select target...' ? this.value : null;
        updateNodeColors();
    });

    graphSvg.addEventListener('mousemove', handleMouseMove);
    graphSvg.addEventListener('mouseup', handleMouseUp);
    graphSvg.addEventListener('mouseleave', handleMouseUp);
}

function getSVGCoordinates(event) {
    const svgRect = graphSvg.getBoundingClientRect();
    const x = event.clientX - svgRect.left;
    const y = event.clientY - svgRect.top;
    const svgX = (x / svgRect.width) * graphSvg.viewBox.baseVal.width;
    const svgY = (y / svgRect.height) * graphSvg.viewBox.baseVal.height;
    return {x: svgX, y: svgY};
}

function handleMouseMove(event) {
    if (!draggedNode) return;
    event.preventDefault();
    const {x, y} = getSVGCoordinates(event);
    draggedNode.x = x;
    draggedNode.y = y;
    renderGraph();
}

function handleMouseUp() {
    draggedNode = null;
    graphSvg.style.cursor = 'default';
}

function generateRandomGraph() {
    const numNodesInput = document.getElementById('num-nodes');
    let numNodes = parseInt(numNodesInput.value, 10);

    // Add a fallback for invalid input
    if (isNaN(numNodes) || numNodes < 3 || numNodes > 26) {
        numNodes = Math.floor(Math.random() * 4) + 5;
        numNodesInput.value = 7; // Also correct the value in the input field
    }

    const numEdges = Math.floor(Math.random() * 6) + numNodes;

    graph.nodes = [];
    graph.edges = [];

    for (let i = 0; i < numNodes; i++) {
        graph.nodes.push({
            id: String.fromCharCode(65 + i),
            x: 100 + Math.random() * 600,
            y: 100 + Math.random() * 400,
            distance: Infinity,
            predecessor: null,
            isSource: false,
            isTarget: false,
            isProcessing: false
        });
    }

    const usedEdges = new Set();
    for (let i = 0; i < numEdges; i++) {
        let fromIndex, toIndex, edgeKey;
        do {
            fromIndex = Math.floor(Math.random() * numNodes);
            toIndex = Math.floor(Math.random() * numNodes);
            edgeKey = `${fromIndex}-${toIndex}`;
        } while (fromIndex === toIndex || usedEdges.has(edgeKey));
        usedEdges.add(edgeKey);

        const weight = Math.floor(Math.random() * 21) - 10;
        graph.edges.push({
            from: graph.nodes[fromIndex].id,
            to: graph.nodes[toIndex].id,
            weight: weight,
            isProcessing: false,
            isInPath: false
        });
    }

    updateNodeSelects();
    renderGraph();
    resetAlgorithm();
}

function updateNodeSelects() {
    const sourceSelect = document.getElementById('source');
    const targetSelect = document.getElementById('target');
    sourceSelect.innerHTML = '<option>Select source...</option>';
    targetSelect.innerHTML = '<option>Select target...</option>';

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
    while (graphSvg.children.length > 1) {
        graphSvg.removeChild(graphSvg.lastChild);
    }
    graph.edges.forEach(renderEdge);
    graph.nodes.forEach(renderNode);
}

function renderEdge(edge) {
    const fromNode = graph.nodes.find(n => n.id === edge.from);
    const toNode = graph.nodes.find(n => n.id === edge.to);
    if (!fromNode || !toNode) return;

    const dx = toNode.x - fromNode.x, dy = toNode.y - fromNode.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const radius = 25;
    const unitX = dx / distance, unitY = dy / distance;
    const startX = fromNode.x + unitX * radius, startY = fromNode.y + unitY * radius;
    const endX = toNode.x - unitX * radius, endY = toNode.y - unitY * radius;
    const midX = (startX + endX) / 2 + (dy / distance) * 20;
    const midY = (startY + endY) / 2 - (dx / distance) * 20;

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', `M ${startX} ${startY} Q ${midX} ${midY} ${endX} ${endY}`);
    path.setAttribute('stroke', edge.isInPath ? '#ef4444' : (edge.isProcessing ? '#f59e0b' : '#374151'));
    path.setAttribute('stroke-width', edge.isInPath ? '3' : '2');
    path.setAttribute('fill', 'none');
    path.setAttribute('marker-end', 'url(#arrowhead)');
    graphSvg.appendChild(path);

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', midX);
    text.setAttribute('y', `${midY - 10}`);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('font-size', '12');
    text.setAttribute('font-weight', 'bold');
    text.setAttribute('fill', edge.weight < 0 ? '#dc2626' : '#059669');
    text.textContent = edge.weight;

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
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
    group.style.cursor = 'grab';
    group.addEventListener('mousedown', (event) => {
        event.preventDefault();
        draggedNode = node;
        graphSvg.style.cursor = 'grabbing';
    });

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', node.x);
    circle.setAttribute('cy', node.y);
    circle.setAttribute('r', '25');
    let fillColor = '#3b82f6';
    if (node.isSource) fillColor = '#10b981';
    else if (node.isTarget) fillColor = '#ef4444';
    else if (node.isProcessing) fillColor = '#f59e0b';
    circle.setAttribute('fill', fillColor);
    circle.setAttribute('stroke', '#1f2937');
    circle.setAttribute('stroke-width', '2');
    group.appendChild(circle);

    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', node.x);
    label.setAttribute('y', node.y + 5);
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('font-size', '16');
    label.setAttribute('font-weight', 'bold');
    label.setAttribute('fill', 'white');
    label.textContent = node.id;
    group.appendChild(label);

    if (distances[node.id] !== undefined) {
        const distanceText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        distanceText.setAttribute('x', node.x);
        distanceText.setAttribute('y', `${node.y - 35}`);
        distanceText.setAttribute('text-anchor', 'middle');
        distanceText.setAttribute('font-size', '12');
        distanceText.setAttribute('font-weight', 'bold');
        distanceText.setAttribute('fill', '#1f2937');
        distanceText.textContent = distances[node.id] === Infinity ? '∞' : distances[node.id];

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
        Swal.fire('Error', 'Please select a source node first!', 'error');
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
        Swal.fire('Error', 'Please select a source node first!', 'error');
        return;
    }
    if (currentIteration === 0) {
        initializeBellmanFord();
    }
    if (currentIteration < maxIterations) {
        performBellmanFordStep();
    } else if (currentIteration === maxIterations) {
        checkForNegativeCycle();
        highlightShortestPath();
        currentIteration++; // Prevent re-running this step
    }
}

function continueAlgorithm() {
    if (!isRunning) return;
    if (currentIteration < maxIterations) {
        performBellmanFordStep();
        setTimeout(() => {
            if (isRunning) continueAlgorithm();
        }, animationSpeed);
    } else {
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

    // NEW: Set up and populate the steps table
    setupStepsTable();
    addStepToTable(0, distances);

    updateStatistics();
    renderGraph();
}

function performBellmanFordStep() {
    let updated = false;
    graph.edges.forEach(edge => {
        edge.isProcessing = true;
        const u = edge.from, v = edge.to, weight = edge.weight;
        if (distances[u] !== Infinity && distances[u] + weight < distances[v]) {
            distances[v] = distances[u] + weight;
            predecessors[v] = u;
            updated = true;
            const node = graph.nodes.find(n => n.id === v);
            if (node) node.distance = distances[v];
        }
    });

    currentIteration++;

    // NEW: Add current step to the table
    addStepToTable(currentIteration, distances);

    setTimeout(() => {
        graph.edges.forEach(edge => {
            edge.isProcessing = false;
        });
        renderGraph();
    }, animationSpeed / 2);

    updateStatistics();
    renderGraph();
}

function checkForNegativeCycle() {
    // NEW: Enhanced cycle detection to provide feedback
    let cycleDetected = false;
    const lastDistances = {...distances}; // Copy distances before the check

    for (const edge of graph.edges) {
        const u = edge.from;
        const v = edge.to;
        const weight = edge.weight;

        if (!cycleDetected && distances[u] !== Infinity && distances[u] + weight < distances[v]) {
            hasNegativeCycle = true;
            cycleDetected = true;

            const infoDiv = document.getElementById('negative-cycle-info');
            infoDiv.innerHTML = `
                <p class="font-bold">🔴 Negative Cycle Detected!</p>
                <p>During the final check (Iteration ${graph.nodes.length}), the edge from <strong>${u}</strong> to <strong>${v}</strong> (weight: ${weight}) could be relaxed further:</p>
                <p class="font-mono text-xs mt-1">dist(${u}) + w < dist(${v}) &nbsp; => &nbsp; ${lastDistances[u]} + (${weight}) < ${lastDistances[v]} &nbsp; => &nbsp; ${lastDistances[u] + weight} < ${lastDistances[v]}</p>`;

            distances[v] = -Infinity; // Mark nodes in a negative cycle as -∞

            // Add a final, highlighted row to the table
            addStepToTable(graph.nodes.length, distances, v);
            break; // Stop after finding the first edge for clarity
        }
    }
    updateStatistics();
}

function highlightShortestPath() {
    if (hasNegativeCycle) {
        Swal.fire({
            icon: 'error',
            title: 'Negative Weight Cycle Detected!',
            text: 'A valid shortest path cannot be determined because the graph contains a negative cycle.',
        });
        return;
    }

    if (!targetNode) return;

    if (distances[targetNode] === Infinity) {
        Swal.fire({
            icon: 'warning',
            title: 'Path Not Found',
            text: `The target node ${targetNode} is not reachable from the source node ${sourceNode}.`,
        });
        return;
    }


    // Clear previous path highlighting
    graph.edges.forEach(edge => {
        edge.isInPath = false;
    });

    // Trace back the shortest path
    let path = []; // NEW: Array to store the path
    let current = targetNode;
    while (current && predecessors[current] !== null) {
        path.push(current); // NEW: Add current node to path array
        const prev = predecessors[current];
        const edge = graph.edges.find(e => e.from === prev && e.to === current);
        if (edge) {
            edge.isInPath = true;
        }
        current = prev;
    }
    path.push(sourceNode); // NEW: Add the source node at the end
    path.reverse(); // NEW: Reverse the array to get the correct order

    // NEW: Display the path information in the new div
    const pathInfoDiv = document.getElementById('shortest-path-info');
    pathInfoDiv.innerHTML = `
        <p class="font-bold">✅ Shortest Path Found!</p>
        <p>Path: <strong>${path.join(' → ')}</strong></p>
        <p>Total Cost: <strong>${distances[targetNode]}</strong></p>
    `;


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

    // Clear the tables and info divs
    document.getElementById('steps-table-header').innerHTML = '';
    const tableBody = document.getElementById('steps-table-body');
    tableBody.innerHTML = '<tr><td colspan="100%" class="px-4 py-4 text-center text-gray-400">Run the algorithm to see the steps.</td></tr>';
    document.getElementById('negative-cycle-info').innerHTML = '';
    document.getElementById('shortest-path-info').innerHTML = ''; // NEW: Clear the path info

    updateStatistics();
    renderGraph();
}

function updateStatistics() {
    const iterationElement = document.querySelector('.text-blue-600');
    if (iterationElement) iterationElement.textContent = `${currentIteration} / ${maxIterations}`;

    document.querySelectorAll('.text-sm.font-semibold')[0].textContent = graph.nodes.length;
    document.querySelectorAll('.text-sm.font-semibold')[1].textContent = graph.edges.length;

    const pathLengthElement = document.querySelector('.text-purple-600');
    if (pathLengthElement && targetNode && distances[targetNode] !== undefined) {
        pathLengthElement.textContent = distances[targetNode] === Infinity ? 'N/A' : distances[targetNode];
    } else if (pathLengthElement) {
        pathLengthElement.textContent = 'N/A';
    }

    const negativeCycleElement = document.querySelector('.text-red-600');
    if (negativeCycleElement) negativeCycleElement.textContent = hasNegativeCycle ? 'Detected' : 'Not Detected';

    const timeElement = document.querySelector('.text-green-600');
    if (timeElement) timeElement.textContent = `${(currentIteration * 0.05).toFixed(2)} ms`;
}

// ====================================================================
// ===== NEW HELPER FUNCTIONS FOR STEPS TABLE =========================
// ====================================================================

/**
 * Creates the header for the steps table based on the current graph nodes.
 */
function setupStepsTable() {
    const header = document.getElementById('steps-table-header');
    const body = document.getElementById('steps-table-body');

    // Clear previous content
    header.innerHTML = '';
    body.innerHTML = '';

    // Sort nodes alphabetically for consistent column order
    const sortedNodes = [...graph.nodes].sort((a, b) => a.id.localeCompare(b.id));

    let headerHTML = '<tr><th scope="col" class="px-4 py-2">Iteration</th>';
    sortedNodes.forEach(node => {
        headerHTML += `<th scope="col" class="px-4 py-2 text-center">dist(${node.id})</th>`;
    });
    headerHTML += '</tr>';
    header.innerHTML = headerHTML;
}

/**
 * Adds a new row to the steps table with the distances from the current iteration.
 * @param {number} iteration - The current iteration number.
 * @param {object} currentDistances - The distances object.
 * @param {string|null} highlightedNode - The ID of a node to highlight in the row (used for cycle detection).
 */
function addStepToTable(iteration, currentDistances, highlightedNode = null) {
    const body = document.getElementById('steps-table-body');
    const sortedNodes = [...graph.nodes].sort((a, b) => a.id.localeCompare(b.id));

    // Special class for the negative cycle detection row
    const rowClass = highlightedNode ? 'bg-red-100 font-semibold' : 'bg-white';

    let rowHTML = `<tr class="${rowClass} border-b">`;
    rowHTML += `<th scope="row" class="px-4 py-2 font-medium text-gray-900 whitespace-nowrap">${iteration > maxIterations ? 'Cycle Check' : `Iteration ${iteration}`}</th>`;

    sortedNodes.forEach(node => {
        const dist = currentDistances[node.id];
        const distDisplay = (dist === Infinity) ? '∞' : (dist === -Infinity ? '-∞' : dist);

        // Special class for the cell that was updated to prove the cycle
        const cellClass = node.id === highlightedNode ? 'text-red-700' : '';
        rowHTML += `<td class="px-4 py-2 text-center ${cellClass}">${distDisplay}</td>`;
    });
    rowHTML += '</tr>';
    body.innerHTML += rowHTML;
}
