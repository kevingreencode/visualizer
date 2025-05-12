// Global variables
let simulation;
let svg;
let width;
let height;
let currentTopology = null;
let graph = null;
let showLabels = true;
let showGrid = true;
let gridSize = 40; // Default grid size
let snapToGrid = true; // Default snap to grid setting
let currentLayout = 'auto'; // Added to track current layout
let selectedNode = null; // To track selected node
let selectedLink = null; // To track selected link

// SVG icon definitions
const svgIcons = {
    // Host icon (server/computer)
    host: {
        path: 'M2,2 v16 h20 v-16 z M4,4 h16 v10 h-16 z M10,15 h4 v3 h-4 z',
        viewBox: '0 0 24 24',
        size: 24
    },
    // Switch icon (network switch)
    switch: {
        path: 'M2,6 v12 h20 v-12 z M4,8 h16 v8 h-16 z M6,10 v4 h2 v-4 z M10,10 v4 h2 v-4 z M14,10 v4 h2 v-4 z M18,10 v4 h2 v-4 z',
        viewBox: '0 0 24 24',
        size: 24
    },
    // Core switch icon (slightly different)
    core: {
        path: 'M2,6 v12 h20 v-12 z M4,8 h16 v8 h-16 z M6,10 v4 h2 v-4 z M10,10 v4 h2 v-4 z M14,10 v4 h2 v-4 z M18,10 v4 h2 v-4 z M2,3 h20 v2 h-20 z M2,19 h20 v2 h-20 z',
        viewBox: '0 0 24 24',
        size: 24
    },
    // Aggregate switch icon
    aggregate: {
        path: 'M2,6 v12 h20 v-12 z M4,8 h16 v8 h-16 z M6,10 v4 h2 v-4 z M10,10 v4 h2 v-4 z M14,10 v4 h2 v-4 z M18,10 v4 h2 v-4 z M10,2 h4 v3 h-4 z',
        viewBox: '0 0 24 24',
        size: 24
    },
    // ToR switch icon
    tor: {
        path: 'M2,6 v12 h20 v-12 z M4,8 h16 v8 h-16 z M6,10 v4 h2 v-4 z M10,10 v4 h2 v-4 z M14,10 v4 h2 v-4 z M18,10 v4 h2 v-4 z M10,19 h4 v3 h-4 z',
        viewBox: '0 0 24 24',
        size: 24
    }
};

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // Set up event listeners
    document.getElementById('upload-btn').addEventListener('click', () => {
        document.getElementById('file-upload').click();
    });

    document.getElementById('file-upload').addEventListener('change', handleFileUpload);
    document.getElementById('toggle-labels-btn').addEventListener('click', toggleLabels);
    document.getElementById('toggle-grid-btn').addEventListener('click', toggleGrid);
    document.getElementById('export-png-btn').addEventListener('click', () => exportTopology('png'));
    document.getElementById('export-jpeg-btn').addEventListener('click', () => exportTopology('jpeg'));
    document.getElementById('export-json-btn').addEventListener('click', exportTopologyAsJson);
    // Update button text to make it clear it works for both nodes and links
    const removeBtn = document.getElementById('remove-node-btn');
    removeBtn.textContent = 'Remove Selected';
    removeBtn.title = 'Remove selected node or link';
    removeBtn.addEventListener('click', removeSelected);

    // Set up add node and link buttons
    document.getElementById('add-node-btn').addEventListener('click', addNewNode);
    document.getElementById('add-link-btn').addEventListener('click', addNewLink);
    
    // New: Add event listeners for network configuration controls
    document.getElementById('assignment-strategy').addEventListener('change', updateNetworkConfig);
    document.getElementById('auto-arp').addEventListener('change', updateNetworkConfig);
    document.getElementById('queue-length').addEventListener('change', updateNetworkConfig);

    // Create reset view button programmatically
    const resetViewBtn = document.createElement('button');
    resetViewBtn.id = 'reset-view-btn';
    resetViewBtn.textContent = 'Reset View';
    resetViewBtn.addEventListener('click', resetView);
    document.getElementById('reset-view-btn').appendChild(resetViewBtn);

    // Add layout selector
    createLayoutSelector();

    // Grid size slider
    const gridSizeSlider = document.getElementById('grid-size');
    gridSizeSlider.addEventListener('input', (e) => {
        gridSize = parseInt(e.target.value);
        document.getElementById('grid-size-value').textContent = `${gridSize}px`;
        if (showGrid) {
            updateGrid();
        }
    });

    // Snap to grid checkbox
    document.getElementById('snap-to-grid').addEventListener('change', (e) => {
        snapToGrid = e.target.checked;
    });

    // Create the SVG container for the graph
    initializeSvg();

    // Draw initial grid
    drawGrid();

    // Create a sample topology if no file is loaded
    createDefaultTopology();
});

// New: Function to handle network configuration updates
function updateNetworkConfig() {
    if (!currentTopology) return;

    // Update topology object with new values
    currentTopology.assignment_strategy = document.getElementById('assignment-strategy').value;
    currentTopology.auto_arp_tables = document.getElementById('auto-arp').checked;
    currentTopology.default_queue_length = parseInt(document.getElementById('queue-length').value);

    // Update the properties info display
    updateTopologyInfo(currentTopology, graph);
}

// New: Function to update configuration controls from topology data
function updateConfigControls(topology) {
    // Set assignment strategy dropdown
    const assignmentStrategy = topology.assignment_strategy || 'l3';
    document.getElementById('assignment-strategy').value = assignmentStrategy;
    
    // Set auto ARP tables checkbox
    const autoArp = topology.auto_arp_tables !== undefined ? topology.auto_arp_tables : true;
    document.getElementById('auto-arp').checked = autoArp;
    
    // Set default queue length input
    const queueLength = topology.default_queue_length !== undefined ? topology.default_queue_length : 100;
    document.getElementById('queue-length').value = queueLength;
}

// Create layout selector dropdown
function createLayoutSelector() {
    const controls = document.querySelector('.controls');

    const layoutContainer = document.createElement('div');
    layoutContainer.style.display = 'inline-block';

    const layoutLabel = document.createElement('label');
    layoutLabel.htmlFor = 'layout-selector';
    layoutLabel.textContent = 'Layout: ';

    const layoutSelect = document.createElement('select');
    layoutSelect.id = 'layout-selector';

    const layouts = [
        { value: 'auto', text: 'Auto Detect' },
        { value: 'fattree', text: 'Fat Tree' },
        { value: 'binary', text: 'Binary Tree' },
        { value: 'linear', text: 'Linear' },
        { value: 'force', text: 'Ugliness' }
    ];

    layouts.forEach(layout => {
        const option = document.createElement('option');
        option.value = layout.value;
        option.textContent = layout.text;
        layoutSelect.appendChild(option);
    });

    layoutSelect.addEventListener('change', (e) => {
        const selectedLayout = e.target.value;

        // If Auto Detect is selected, determine the layout type
        if (selectedLayout === 'auto' && graph) {
            const detectedType = detectTopologyType(graph, currentTopology);
            currentLayout = detectedType;

            // Update dropdown to show detected layout, without triggering another change event
            const layoutSelector = document.getElementById('layout-selector');
            layoutSelector.value = detectedType;
        } else {
            currentLayout = selectedLayout;
        }

        // Redraw the graph with the new layout
        if (graph) {
            visualizeGraph(graph);
        }
    });

    layoutContainer.appendChild(layoutLabel);
    layoutContainer.appendChild(layoutSelect);
    controls.appendChild(layoutContainer);
}

// Create a simple default topology when the page loads
function createDefaultTopology() {
    const defaultTopology = {
        "topology": {
            "hosts": {
                "h1": {},
                "h2": {},
                "h3": {},
                "h4": {}
            },
            "switches": {
                "t1": {},
                "t2": {},
                "a1": {},
                "a2": {},
                "c1": {}
            },
            "links": [
                ["h1", "t1"],
                ["h2", "t1"],
                ["h3", "t2"],
                ["h4", "t2"],
                ["t1", "a1"],
                ["t1", "a2"],
                ["t2", "a1"],
                ["t2", "a2"],
                ["a1", "c1"],
                ["a2", "c1"]
            ],
            "assignment_strategy": "l3",
            "auto_arp_tables": true,
            "default_queue_length": 100
        }
    };

    loadTopology(defaultTopology);
}

// Handle file upload
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);

            // Always reset to auto-detect for new files
            currentLayout = 'auto';

            loadTopology(data);
        } catch (error) {
            alert('Error parsing JSON file: ' + error.message);
        }
    };
    reader.readAsText(file);
}

// Toggle visibility of node and link labels
function toggleLabels() {
    showLabels = !showLabels;

    // Update the labels visibility
    svg.selectAll('.node-label')
        .style('display', showLabels ? 'block' : 'none');

    svg.selectAll('.bandwidth-label')
        .style('display', showLabels ? 'block' : 'none');

    // Update button text
    document.getElementById('toggle-labels-btn').textContent =
        showLabels ? 'Hide Labels' : 'Show Labels';
}

// Toggle visibility of the grid
function toggleGrid() {
    showGrid = !showGrid;

    // Update grid visibility
    svg.selectAll('.grid-line')
        .style('display', showGrid ? 'block' : 'none');

    // Update button text
    document.getElementById('toggle-grid-btn').textContent =
        showGrid ? 'Hide Grid' : 'Show Grid';
}

// Draw the grid lines
function drawGrid() {
    const gridGroup = svg.append('g')
        .attr('class', 'grid');

    updateGrid();
}

// Update grid when size changes
function updateGrid() {
    // Clear existing grid
    svg.select('.grid').selectAll('*').remove();

    const gridGroup = svg.select('.grid');

    // Calculate number of lines based on container dimensions
    const numHorizontalLines = Math.floor(height / gridSize);
    const numVerticalLines = Math.floor(width / gridSize);

    // Draw horizontal grid lines
    for (let i = 0; i <= numHorizontalLines; i++) {
        gridGroup.append('line')
            .attr('class', 'grid-line')
            .attr('x1', 0)
            .attr('y1', i * gridSize)
            .attr('x2', width)
            .attr('y2', i * gridSize)
            .style('display', showGrid ? 'block' : 'none');
    }

    // Draw vertical grid lines
    for (let i = 0; i <= numVerticalLines; i++) {
        gridGroup.append('line')
            .attr('class', 'grid-line')
            .attr('x1', i * gridSize)
            .attr('y1', 0)
            .attr('x2', i * gridSize)
            .attr('y2', height)
            .style('display', showGrid ? 'block' : 'none');
    }
}

// Load topology data and build the graph
function loadTopology(data) {
    // Save existing node positions if we have a current graph
    const nodePositions = {};
    if (graph && graph.nodes) {
        graph.nodes.forEach(node => {
            // Only save positions if they've been set by the user
            if (node.fx !== null || node.fy !== null) {
                nodePositions[node.id] = {
                    x: node.x,
                    y: node.y,
                    fx: node.fx,
                    fy: node.fy
                };
            }
        });
    }

    // Reset any selection
    selectedNode = null;
    selectedLink = null;

    // Extract topology section
    currentTopology = data.topology || data;
    
    // New: Update configuration controls with values from the loaded topology
    updateConfigControls(currentTopology);

    // Build graph structure
    graph = buildGraph(currentTopology);

    // Restore saved positions for nodes still in the graph
    if (Object.keys(nodePositions).length > 0) {
        graph.nodes.forEach(node => {
            if (nodePositions[node.id]) {
                node.x = nodePositions[node.id].x;
                node.y = nodePositions[node.id].y;
                node.fx = nodePositions[node.id].fx;
                node.fy = nodePositions[node.id].fy;
            }
        });
    }

    // Always auto-detect the topology type for newly loaded files
    const detectedType = detectTopologyType(graph, currentTopology);
    currentLayout = detectedType;

    // Update the dropdown to show the detected type
    const layoutSelector = document.getElementById('layout-selector');
    layoutSelector.value = detectedType;

    // Update UI with topology information
    updateTopologyInfo(currentTopology, graph);

    // Update node dropdowns for links
    updateNodeDropdowns();

    // Visualize the graph
    visualizeGraph(graph);
}

// Update the node dropdowns for creating links
function updateNodeDropdowns() {
    if (!graph || !graph.nodes) return;

    const sourceSelect = document.getElementById('link-source');
    const targetSelect = document.getElementById('link-target');

    // Clear current options
    sourceSelect.innerHTML = '<option value="">Select a node</option>';
    targetSelect.innerHTML = '<option value="">Select a node</option>';

    // Sort nodes by ID for easier selection
    const sortedNodes = [...graph.nodes].sort((a, b) => a.id.localeCompare(b.id));

    // Add options for each node
    sortedNodes.forEach(node => {
        const sourceOption = document.createElement('option');
        sourceOption.value = node.id;
        sourceOption.textContent = node.id;
        sourceSelect.appendChild(sourceOption);

        const targetOption = document.createElement('option');
        targetOption.value = node.id;
        targetOption.textContent = node.id;
        targetSelect.appendChild(targetOption);
    });
}

// Add a new node to the topology
function addNewNode() {
    if (!currentTopology) {
        alert('No topology loaded. Please load or create a topology first.');
        return;
    }

    const nodeId = document.getElementById('node-id').value.trim();
    const nodeType = document.getElementById('node-type').value;

    // Validate node ID
    if (!nodeId) {
        alert('Please enter a node ID.');
        return;
    }

    // Check if ID already exists
    if (graph.nodes.some(node => node.id === nodeId)) {
        alert(`Node with ID "${nodeId}" already exists. Please use a different ID.`);
        return;
    }

    // Validate node ID format based on type
    const validateNodeId = () => {
        const prefix = nodeId.charAt(0);
        const validPrefixes = {
            'host': 'h',
            'tor': 't',
            'aggregate': 'a',
            'core': 'c',
            'switch': 's'
        };

        if (prefix !== validPrefixes[nodeType]) {
            const isConfirmed = confirm(
                `Node ID "${nodeId}" doesn't follow the naming convention for ${nodeType} (should start with "${validPrefixes[nodeType]}"). Continue anyway?`
            );
            return isConfirmed;
        }
        return true;
    };

    if (!validateNodeId()) {
        return;
    }

    // Determine where to add node (hosts or switches)
    const addToHosts = nodeType === 'host';

    // Add to topology data
    if (addToHosts) {
        if (!currentTopology.hosts) {
            currentTopology.hosts = {};
        }
        currentTopology.hosts[nodeId] = {};
    } else {
        if (!currentTopology.switches) {
            currentTopology.switches = {};
        }
        currentTopology.switches[nodeId] = {};
    }

    // Create the new node
    const newNode = {
        id: nodeId,
        type: nodeType,
        config: {},
        ports: {}
    };

    //-------------------------------------------------------------------
    //  TOP-LEFT-QUADRANT PLACEMENT – look only at the last node we added
    //-------------------------------------------------------------------
    const margin = gridSize;          // one grid square of padding
    const spacing = gridSize * 4;      // how far to nudge each time

    // the "quadrant" boundaries
    const maxX = width / 2 - margin;
    const maxY = height / 2 - margin;

    // keep track of the previous drop point on the graph object itself
    if (!graph.lastDropPos) {
        // first ever click – start in the corner
        graph.lastDropPos = { x: margin, y: margin };
    } else {
        // nudge right
        graph.lastDropPos.x += spacing;

        // if that would leave the quadrant, move to a new line
        if (graph.lastDropPos.x > maxX) {
            graph.lastDropPos.x = margin;              // back to the left edge
            graph.lastDropPos.y += spacing;            // one row down
            // make sure we never leave the quadrant vertically, either
            if (graph.lastDropPos.y > maxY) {
                graph.lastDropPos.y = maxY;            // clamp to the last visible row
            }
        }
    }

    // finally assign the coords to the new node
    newNode.x = graph.lastDropPos.x;
    newNode.y = graph.lastDropPos.y;
    newNode.fx = newNode.x;   // keep it fixed until the user drags it
    newNode.fy = newNode.y;

    newNode._userAdded = true;   // optional flag if you need it elsewhere

    // Add the node to the graph
    graph.nodes.push(newNode);

    // Update UI and redraw
    updateTopologyInfo(currentTopology, graph);
    updateNodeDropdowns();
    
    // Instead of visualizeGraph, just add the new node to the visualization
    // This prevents re-layout of existing nodes
    addNodeToVisualization(newNode);

    // Clear input field
    document.getElementById('node-id').value = '';
}

// New function to add a single node to the visualization
function addNodeToVisualization(newNode) {
    // Instead of adding just one node, redraw the visualization but preserve positions
    // This ensures that the simulation and drag behavior work correctly with all nodes
    
    // Clear previous graph, but keep the grid
    svg.select('g').selectAll('*').remove();
    
    // Create links first (so they appear under nodes)
    const link = svg.select('g').selectAll('.link')
        .data(graph.links)
        .enter()
        .append('line')
        .attr('class', 'link')
        .attr('stroke-width', d => d.properties.bw ? Math.sqrt(d.properties.bw) * 0.5 : 1)
        .attr('stroke', '#999')
        .attr('stroke-opacity', 0.6);

    // Add click event to links with improved visual feedback
    link.on('click', (event, d) => {
        // Clear previous selection
        svg.selectAll('.selected').classed('selected', false);

        // Mark this link as selected with enhanced visual feedback
        const selectedLinkElement = d3.select(event.currentTarget);
        selectedLinkElement.classed('selected', true);
        selectedLinkElement
            .attr('stroke-width', d => (d.properties.bw ? Math.sqrt(d.properties.bw) * 0.5 : 1) + 2)
            .attr('stroke', '#ff6600')  // Bright orange for selected link
            .attr('stroke-opacity', 1.0);

        // Update selection tracking
        selectedNode = null;
        selectedLink = d;

        // Show link details with additional hint about removal
        showLinkDetails(d);

        // Show a message in the details panel about link removal
        const detailsPanel = document.getElementById('details-panel');
        const tipElement = document.createElement('div');
        tipElement.className = 'selection-tip';
        tipElement.innerHTML = '<p style="color: #ff6600; font-weight: bold;">Click "Remove Selected" to delete this link.</p>';
        detailsPanel.appendChild(tipElement);

        // Stop propagation to prevent other click events
        event.stopPropagation();
    });

    // Create node groups
    const nodeGroup = svg.select('g').selectAll('.node-group')
        .data(graph.nodes)
        .enter()
        .append('g')
        .attr('class', 'node-group')
        .attr('transform', d => `translate(${d.x}, ${d.y})`)
        .call(d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended));

    // Add node icon
    nodeGroup.each(function (d) {
        const node = d3.select(this);
        const iconType = d.type === 'host' ? 'host' :
            (d.type === 'core' ? 'core' :
                d.type === 'aggregate' ? 'aggregate' :
                    d.type === 'tor' ? 'tor' : 'switch');

        const icon = svgIcons[iconType];

        // Background circle for easier selection and consistent coloring
        node.append('circle')
            .attr('class', 'node')
            .attr('r', 14)
            .attr('fill', getNodeColor(d.type));

        // The actual icon path
        node.append('path')
            .attr('d', icon.path)
            .attr('class', 'node-icon')
            .attr('fill', '#ffffff')  // White icon
            .attr('stroke', '#000000')  // Black outline
            .attr('stroke-width', 0.5)
            .attr('transform', `translate(-12, -12)`);  // Center the icon
    });

    // Add node labels
    const nodeLabels = svg.select('g').selectAll('.node-label')
        .data(graph.nodes)
        .enter()
        .append('text')
        .attr('class', 'node-label')
        .attr('x', d => d.x)
        .attr('y', d => d.y)
        .attr('dx', 16)
        .attr('dy', 4)
        .text(d => d.id)
        .style('display', showLabels ? 'block' : 'none');

    // Add bandwidth labels to links
    const linkLabels = svg.select('g').selectAll('.bandwidth-label')
        .data(graph.links.filter(d => d.properties.bw))
        .enter()
        .append('text')
        .attr('class', 'bandwidth-label')
        .text(d => `${d.properties.bw} Mbps`)
        .style('display', showLabels ? 'block' : 'none')
        .attr('x', d => (d.source.x + d.target.x) / 2)
        .attr('y', d => (d.source.y + d.target.y) / 2);

    // Add click event to nodes
    nodeGroup.on('click', (event, d) => {
        // Clear previous selection
        svg.selectAll('.selected').classed('selected', false);

        // Mark this node as selected
        d3.select(event.currentTarget).select('.node').classed('selected', true);

        // Update selection tracking
        selectedNode = d;
        selectedLink = null;

        // Show node details
        showNodeDetails(d);

        // Stop propagation to prevent other click events
        event.stopPropagation();
    });

    // Set up simulation with the updated nodes and links
    if (simulation) {
        simulation.stop();
    }

    simulation = d3.forceSimulation(graph.nodes)
        .force('link', d3.forceLink(graph.links).id(d => d.id).distance(100))
        .force('x', d3.forceX(d => d.x).strength(0.5))
        .force('charge', d3.forceManyBody().strength(-50));

    // Only add Y force for non-fat tree layouts
    if (currentLayout !== 'fattree') {
        simulation.force('y', d3.forceY(d => d.y).strength(0.5));
    }

    simulation.alphaDecay(0.1); // Faster settling

    // Update simulation on each tick
    simulation.on('tick', () => {
        // For fat tree layout, ensure Y positions stay fixed
        if (currentLayout === 'fattree') {
            graph.nodes.forEach(d => {
                // Keep Y position fixed for fat tree layout
                if (d.fy !== undefined) {
                    d.y = d.fy;
                }
            });
        }

        // Snap nodes to grid if enabled
        if (snapToGrid) {
            graph.nodes.forEach(d => {
                // Only snap nodes that are not being dragged
                if (!d.isDragging) {
                    d.x = Math.round(d.x / gridSize) * gridSize;
                    if (currentLayout !== 'fattree') {
                        d.y = Math.round(d.y / gridSize) * gridSize;
                    }
                }
            });
        }

        // Update link positions, maintaining selection status
        link.each(function(d) {
            const linkElement = d3.select(this);
            linkElement
                .attr('x1', d.source.x)
                .attr('y1', d.source.y)
                .attr('x2', d.target.x)
                .attr('y2', d.target.y);
                
            // Keep selected link highlighted
            if (selectedLink === d) {
                linkElement
                    .attr('stroke', '#ff6600')
                    .attr('stroke-opacity', 1.0)
                    .attr('stroke-width', (d.properties.bw ? Math.sqrt(d.properties.bw) * 0.5 : 1) + 2);
            }
        });

        nodeGroup
            .attr('transform', d => `translate(${d.x}, ${d.y})`);

        nodeLabels
            .attr('x', d => d.x)
            .attr('y', d => d.y);

        linkLabels
            .attr('x', d => (d.source.x + d.target.x) / 2)
            .attr('y', d => (d.source.y + d.target.y) / 2);
    });
    
    // Add click handler to SVG background to clear selection
    svg.on('click', (event) => {
        if (event.target === svg.node() || event.target.classList.contains('grid-line')) {
            // Reset all link styles to default when deselecting
            svg.selectAll('.link').each(function() {
                const link = d3.select(this);
                const d = link.datum();
                link
                    .classed('selected', false)
                    .attr('stroke', '#999')
                    .attr('stroke-opacity', 0.6)
                    .attr('stroke-width', d.properties.bw ? Math.sqrt(d.properties.bw) * 0.5 : 1);
            });
            
            // Clear other selections
            svg.selectAll('.selected').classed('selected', false);
            selectedNode = null;
            selectedLink = null;

            // Update details panel
            document.getElementById('details-panel').innerHTML = `
                <h3>Details</h3>
                <p>Click on a node or link to see details.</p>
                <p><em>Tip: You can select a link by clicking on it, then remove it using the "Remove Selected" button.</em></p>
            `;
        }
    });
    
    // Start the simulation with low alpha to just update positions
    simulation.alpha(0.3).restart();
}

// Helper function to get the next available port number for a node
function getNextPortNumber(nodeId) {
    const node = graph.nodes.find(n => n.id === nodeId);
    if (!node) return 1;
    
    // Get all used port numbers for this node
    const usedPorts = Object.values(node.ports);
    if (usedPorts.length === 0) return 1;
    
    // Return the next available port number
    return Math.max(...usedPorts) + 1;
}

// Add a new link to the topology
function addNewLink() {
    if (!currentTopology) {
        alert('No topology loaded. Please load or create a topology first.');
        return;
    }

    const sourceId = document.getElementById('link-source').value;
    const targetId = document.getElementById('link-target').value;
    const bandwidth = document.getElementById('link-bandwidth').value;

    // Validate selections
    if (!sourceId || !targetId) {
        alert('Please select both source and target nodes.');
        return;
    }

    if (sourceId === targetId) {
        alert('Source and target nodes must be different.');
        return;
    }

    // Check if link already exists
    const linkExists = currentTopology.links.some(link =>
        (link[0] === sourceId && link[1] === targetId) ||
        (link[0] === targetId && link[1] === sourceId)
    );

    if (linkExists) {
        alert('A link between these nodes already exists.');
        return;
    }

    // Create the link
    let newLink;
    if (bandwidth && !isNaN(parseInt(bandwidth))) {
        newLink = [sourceId, targetId, { bw: parseInt(bandwidth) }];
    } else {
        newLink = [sourceId, targetId];
    }

    // Add to topology data
    currentTopology.links.push(newLink);

    // Find the actual node objects in the graph
    const sourceNode = graph.nodes.find(n => n.id === sourceId);
    const targetNode = graph.nodes.find(n => n.id === targetId);

    // Assign port numbers
    // Simplified version for addNewLink - we'll use the actual implementation based on your existing code
    const sourcePort = getNextPortNumber(sourceId);
    const targetPort = getNextPortNumber(targetId);

    // Store port assignments in the nodes
    if (sourceNode) {
        sourceNode.ports[targetId] = sourcePort;
    }
    if (targetNode) {
        targetNode.ports[sourceId] = targetPort;
    }

    // Create the link object for the graph
    const linkObj = {
        source: sourceNode,
        target: targetNode,
        properties: bandwidth && !isNaN(parseInt(bandwidth)) ? { bw: parseInt(bandwidth) } : {},
        sourcePort: sourcePort,
        targetPort: targetPort
    };

    // Add the link to the graph
    graph.links.push(linkObj);

    // Update UI 
    updateTopologyInfo(currentTopology, graph);
    
    // Add the new link to the visualization instead of redrawing everything
    addLinkToVisualization(linkObj);

    // Reset form
    document.getElementById('link-source').value = '';
    document.getElementById('link-target').value = '';
    document.getElementById('link-bandwidth').value = '';
}

// New function to add a single link to the visualization
function addLinkToVisualization(newLink) {
    // Similar to addNodeToVisualization, we'll redraw everything to ensure
    // the simulation and elements all work correctly together
    
    // Call the same visualization approach we use for adding nodes
    // This ensures consistency and proper drag behavior
    addNodeToVisualization(null);
}

// Remove selected node or link
function removeSelected() {
    if (!currentTopology) {
        alert('No topology loaded.');
        return;
    }

    // Check if a node is selected
    if (selectedNode) {
        const nodeId = selectedNode.id;

        // Check if node has links connected to it
        const hasLinks = graph.links.some(link => {
            const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
            const targetId = typeof link.target === 'object' ? link.target.id : link.target;
            return sourceId === nodeId || targetId === nodeId;
        });

        if (hasLinks) {
            const confirmRemove = confirm(`Node "${nodeId}" has links connected to it. Removing it will also remove these links. Continue?`);
            if (!confirmRemove) return;
        }

        // Store positions of all nodes
        const nodePositions = {};
        graph.nodes.forEach(node => {
            nodePositions[node.id] = {
                x: node.x,
                y: node.y,
                fx: node.fx,
                fy: node.fy
            };
        });

        // Remove node from topology
        if (nodeId.charAt(0) === 'h' || currentTopology.hosts && currentTopology.hosts[nodeId]) {
            delete currentTopology.hosts[nodeId];
        } else {
            delete currentTopology.switches[nodeId];
        }

        // Remove connected links from topology
        currentTopology.links = currentTopology.links.filter(link =>
            link[0] !== nodeId && link[1] !== nodeId
        );

        // Remove node from graph
        graph.nodes = graph.nodes.filter(node => node.id !== nodeId);

        // Remove connected links from graph
        graph.links = graph.links.filter(link => {
            const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
            const targetId = typeof link.target === 'object' ? link.target.id : link.target;
            return sourceId !== nodeId && targetId !== nodeId;
        });

        // Restore positions for remaining nodes
        graph.nodes.forEach(node => {
            if (nodePositions[node.id]) {
                node.x = nodePositions[node.id].x;
                node.y = nodePositions[node.id].y;
                node.fx = nodePositions[node.id].fx;
                node.fy = nodePositions[node.id].fy;
            }
        });

        updateTopologyInfo(currentTopology, graph);
        updateNodeDropdowns();
        visualizeGraph(graph);

        // Clear selection
        selectedNode = null;

        // Update details panel
        document.getElementById('details-panel').innerHTML = `
            <h3>Node Details</h3>
            <p>Node "${nodeId}" removed. Click on a node to see details.</p>
        `;
    }
    // Check if a link is selected
    else if (selectedLink) {
        const sourceId = typeof selectedLink.source === 'object' ?
            selectedLink.source.id : selectedLink.source;
        const targetId = typeof selectedLink.target === 'object' ?
            selectedLink.target.id : selectedLink.target;

        // Store positions of all nodes
        const nodePositions = {};
        graph.nodes.forEach(node => {
            nodePositions[node.id] = {
                x: node.x,
                y: node.y,
                fx: node.fx,
                fy: node.fy
            };
        });

        // Remove link from topology
        currentTopology.links = currentTopology.links.filter(link =>
            !(link[0] === sourceId && link[1] === targetId) &&
            !(link[0] === targetId && link[1] === sourceId)
        );

        // Remove link from graph
        graph.links = graph.links.filter(link => {
            const linkSourceId = typeof link.source === 'object' ? link.source.id : link.source;
            const linkTargetId = typeof link.target === 'object' ? link.target.id : link.target;
            return !(
                (linkSourceId === sourceId && linkTargetId === targetId) ||
                (linkSourceId === targetId && linkTargetId === sourceId)
            );
        });

        // Restore positions for all nodes
        graph.nodes.forEach(node => {
            if (nodePositions[node.id]) {
                node.x = nodePositions[node.id].x;
                node.y = nodePositions[node.id].y;
                node.fx = nodePositions[node.id].fx;
                node.fy = nodePositions[node.id].fy;
            }
        });

        updateTopologyInfo(currentTopology, graph);
        visualizeGraph(graph);

        // Clear selection
        selectedLink = null;

        // Update details panel
        document.getElementById('details-panel').innerHTML = `
            <h3>Link Details</h3>
            <p>Link between "${sourceId}" and "${targetId}" removed. Click on a node to see details.</p>
        `;
    } else {
        alert('No node or link selected. Please select a node or link to remove.');
    }
}

// Export topology as JSON file
function exportTopologyAsJson() {
    if (!currentTopology) {
        alert('No topology loaded.');
        return;
    }

    // Create JSON data
    const jsonData = {
        topology: currentTopology
    };

    // Convert to JSON string
    const jsonString = JSON.stringify(jsonData, null, 2);

    // Create download link
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'network-topology.json';
    link.click();

    // Clean up
    URL.revokeObjectURL(url);
}

// Detect the type of topology based on graph structure and naming
function detectTopologyType(graph, topology) {
    // Count node types
    const nodeTypeCount = {};
    graph.nodes.forEach(node => {
        nodeTypeCount[node.type] = (nodeTypeCount[node.type] || 0) + 1;
    });

    // Check for specific node naming patterns by prefix
    const prefixCounts = {};
    graph.nodes.forEach(node => {
        const prefix = node.id.charAt(0);
        prefixCounts[prefix] = (prefixCounts[prefix] || 0) + 1;
    });

    // Binary tree detection should take priority - check for 'b' prefixed nodes
    // which are only used in binary tree topologies
    if (prefixCounts['b']) {
        return 'binary';
    }

    // Check for fat tree structure (core, aggregate, edge layers)
    const hasFatTreeNaming =
        (prefixCounts['c'] && prefixCounts['a'] && prefixCounts['t']) ||
        (nodeTypeCount['core'] && nodeTypeCount['aggregate'] && nodeTypeCount['tor']);

    if (hasFatTreeNaming) {
        return 'fattree';
    }

    // Check for simple linear topology
    const hasSimpleNaming = prefixCounts['s'] && prefixCounts['s'] < 10;
    if (hasSimpleNaming) {
        return 'linear';
    }

    // Default to force-directed for unknown topologies
    return 'force';
}

// Build graph structure from topology data
function buildGraph(topology) {
    // Store positions of existing nodes
    const nodePositions = {};
    if (graph && graph.nodes) {
        graph.nodes.forEach(node => {
            nodePositions[node.id] = {
                x: node.x,
                y: node.y,
                fx: node.fx,
                fy: node.fy
            };
        });
    }

    const nodes = [];
    const links = [];

    // Add hosts to nodes
    for (const hostId in topology.hosts) {
        const node = {
            id: hostId,
            type: getNodeType(hostId, topology),
            config: topology.hosts[hostId],
            ports: {} // Store port assignments
        };
        
        // Restore position if it exists
        if (nodePositions[hostId]) {
            node.x = nodePositions[hostId].x;
            node.y = nodePositions[hostId].y;
            node.fx = nodePositions[hostId].fx;
            node.fy = nodePositions[hostId].fy;
        }
        
        nodes.push(node);
    }

    // Add switches to nodes
    for (const switchId in topology.switches) {
        const node = {
            id: switchId,
            type: getNodeType(switchId, topology),
            config: topology.switches[switchId],
            ports: {} // Store port assignments
        };
        
        // Restore position if it exists
        if (nodePositions[switchId]) {
            node.x = nodePositions[switchId].x;
            node.y = nodePositions[switchId].y;
            node.fx = nodePositions[switchId].fx;
            node.fy = nodePositions[switchId].fy;
        }
        
        nodes.push(node);
    }

    // Track port assignments for each node
    const nodePortCounters = {};

    // Initialize port counters
    nodes.forEach(node => {
        nodePortCounters[node.id] = 1; // Start port numbering from 1
    });

    // Add links and assign port numbers
    topology.links.forEach(link => {
        const sourceId = link[0];
        const targetId = link[1];
        let properties = {};

        // Check if link has properties
        if (link.length > 2) {
            properties = link[2];
        }

        // Assign port numbers
        const sourcePort = nodePortCounters[sourceId]++;
        const targetPort = nodePortCounters[targetId]++;

        // Store port assignments in the nodes
        const sourceNode = nodes.find(n => n.id === sourceId);
        const targetNode = nodes.find(n => n.id === targetId);

        if (sourceNode) {
            sourceNode.ports[targetId] = sourcePort;
        }
        if (targetNode) {
            targetNode.ports[sourceId] = targetPort;
        }

        links.push({
            source: sourceId,
            target: targetId,
            properties,
            sourcePort,
            targetPort
        });
    });

    // Preserve lastDropPos if it existed
    if (graph && graph.lastDropPos) {
        const newGraph = { nodes, links };
        newGraph.lastDropPos = graph.lastDropPos;
        return newGraph;
    }

    return { nodes, links };
}

// Determine node type based on its id and topology context
function getNodeType(nodeId, topology) {
    const prefix = nodeId.charAt(0);

    // Standard naming conventions for fat trees
    if (prefix === 'h') return 'host';

    // For fat tree naming
    if (prefix === 't') return 'tor';
    if (prefix === 'a' && topology && isInFatTreeTopology(topology)) return 'aggregate';
    if (prefix === 'c' && topology && isInFatTreeTopology(topology)) return 'core';

    // For binary tree naming (a, b, c, d)
    if (topology && isInBinaryTreeTopology(topology)) {
        if (prefix === 'a') {
            // In binary tree, 'a' is typically the root (core)
            return 'core';
        }
        if (prefix === 'b' || prefix === 'c') {
            // 'b' and 'c' are middle levels (aggregate)
            return 'aggregate';
        }
        if (prefix === 'd') {
            // 'd' nodes that connect to hosts are ToR switches
            if (isConnectedToHosts(nodeId, topology)) {
                return 'tor';
            }
            return 'aggregate';
        }
    }

    // Handle generic switches with 's' prefix
    if (prefix === 's') {
        // Always treat 's' prefixed nodes as generic switches
        return 'switch';
    }

    // Default to aggregate for any switch-like nodes in fat tree topologies
    if (isInFatTreeTopology(topology)) {
        return 'aggregate';
    }

    // Default case for any other node
    return 'switch';
}

// Helper function to detect if this is a fat tree topology
function isInFatTreeTopology(topology) {
    if (!topology || !topology.links) return false;

    // Check for fat tree naming patterns (t, a, c nodes)
    const hasToRNodes = topology.links.some(link =>
        link[0].charAt(0) === 't' || link[1].charAt(0) === 't'
    );

    const hasAggregateNodes = topology.links.some(link =>
        link[0].charAt(0) === 'a' || link[1].charAt(0) === 'a'
    );

    const hasCoreNodes = topology.links.some(link =>
        link[0].charAt(0) === 'c' || link[1].charAt(0) === 'c'
    );

    // Fat tree must have dedicated ToR nodes
    return hasToRNodes && (hasAggregateNodes || hasCoreNodes);
}

// Helper function to detect if this is a binary tree topology
function isInBinaryTreeTopology(topology) {
    if (!topology || !topology.links) return false;

    // Check for binary tree naming patterns (a, b, c, d nodes)
    const prefixes = new Set();
    topology.links.forEach(link => {
        prefixes.add(link[0].charAt(0));
        prefixes.add(link[1].charAt(0));
    });

    // Binary tree should have nodes from multiple levels (a, b, c, d)
    const hasBinaryPattern = prefixes.has('a') && prefixes.has('b') &&
        (prefixes.has('c') || prefixes.has('d'));

    // Should NOT have dedicated 't' nodes (which are fat tree specific)
    const hasToRNodes = prefixes.has('t');

    return hasBinaryPattern && !hasToRNodes;
}

// Helper function to check if a node is connected to hosts
function isConnectedToHosts(nodeId, topology) {
    if (!topology || !topology.links) return false;

    return topology.links.some(link => {
        const sourceId = link[0];
        const targetId = link[1];

        if (sourceId === nodeId && targetId.charAt(0) === 'h') return true;
        if (targetId === nodeId && sourceId.charAt(0) === 'h') return true;

        return false;
    });
}

// Initialize SVG container
function initializeSvg() {
    const container = document.getElementById('graph-container');
    width = container.clientWidth;
    height = container.clientHeight;

    // Create zoom behavior
    const zoom = d3.zoom()
        .scaleExtent([0.1, 10]) // Allow zooming from 0.1x to 10x
        .on('zoom', (event) => {
            svg.select('g').attr('transform', event.transform);
        });

    svg = d3.select('#graph-container')
        .append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('viewBox', [0, 0, width, height])
        .call(zoom);

    // Store zoom behavior for later use in resetView
    svg.zoom = zoom;

    // Add a group element for the graph
    const g = svg.append('g');
}

// Visualize the graph
function visualizeGraph(graph) {
    // Clear previous graph, but keep the grid
    svg.select('g').selectAll('*').remove();

    // Reset selection tracking
    selectedNode = null;
    selectedLink = null;

    // Only apply layout to nodes without positions
    const newNodes = graph.nodes.filter(node => node.x === undefined || node.y === undefined);
    
    // Store existing node positions before applying any layout
    const positionedNodes = graph.nodes.filter(node => node.x !== undefined && node.y !== undefined);
    const existingPositions = {};
    
    positionedNodes.forEach(node => {
        existingPositions[node.id] = {
            x: node.x,
            y: node.y,
            fx: node.fx,
            fy: node.fy
        };
    });

    // Apply layout based on selected type only for new nodes
    if (newNodes.length > 0) {
        switch (currentLayout) {
            case 'fattree':
                applyFatTreeLayout(graph);
                break;
            case 'binary':
                applyBinaryTreeLayout(graph);
                break;
            case 'linear':
                applyLinearLayout(graph);
                break;
            case 'force':
            default:
                applyForceDirectedLayout(graph);
                break;
        }
    }

    // Restore existing node positions after layout
    graph.nodes.forEach(node => {
        if (existingPositions[node.id]) {
            node.x = existingPositions[node.id].x;
            node.y = existingPositions[node.id].y;
            node.fx = existingPositions[node.id].fx;
            node.fy = existingPositions[node.id].fy;
        }
        // For nodes without positions, snap to grid if needed
        else if (snapToGrid && node.layoutX && node.layoutY) {
            node.x = Math.round(node.layoutX / gridSize) * gridSize;
            node.y = Math.round(node.layoutY / gridSize) * gridSize;
            // For fat tree layout, prevent vertical movement by fixing Y position
            if (currentLayout === 'fattree') {
                node.fy = node.y;  // Fix Y position
            }
        } else if (node.layoutX && node.layoutY) {
            node.x = node.layoutX;
            node.y = node.layoutY;
            // For fat tree layout, prevent vertical movement
            if (currentLayout === 'fattree') {
                node.fy = node.y;  // Fix Y position
            }
        }
    });

    // Auto-zoom to fit the topology if there are new nodes
    if (newNodes.length > 0) {
        autoZoomToFit(graph);
    }

    // Set up force simulation with constraints for fat tree
    if (simulation) {
        simulation.stop();
    }

    simulation = d3.forceSimulation(graph.nodes)
        .force('link', d3.forceLink(graph.links).id(d => d.id).distance(100))
        .force('x', d3.forceX(d => d.x).strength(0.5))
        .force('charge', d3.forceManyBody().strength(-50));

    // Only add Y force for non-fat tree layouts
    if (currentLayout !== 'fattree') {
        simulation.force('y', d3.forceY(d => d.y).strength(0.5));
    }

    simulation.alphaDecay(0.1); // Faster settling

    // Create links first (so they appear under nodes)
    const link = svg.select('g').selectAll('.link')
        .data(graph.links)
        .enter()
        .append('line')
        .attr('class', 'link')
        .attr('stroke-width', d => d.properties.bw ? Math.sqrt(d.properties.bw) * 0.5 : 1)
        .attr('stroke', '#999')  // Ensure links have a visible stroke color
        .attr('stroke-opacity', 0.6);

    // Add click event to links
    link.on('click', (event, d) => {
        // Clear previous selection
        svg.selectAll('.selected').classed('selected', false);

        // Mark this link as selected
        d3.select(event.currentTarget).classed('selected', true);

        // Update selection tracking
        selectedNode = null;
        selectedLink = d;

        // Show link details
        showLinkDetails(d);

        // Stop propagation to prevent other click events
        event.stopPropagation();
    });

    // Create node groups
    const nodeGroup = svg.select('g').selectAll('.node-group')
        .data(graph.nodes)
        .enter()
        .append('g')
        .attr('class', 'node-group')
        .call(d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended));

    // Add node icon
    nodeGroup.each(function (d) {
        const node = d3.select(this);
        const iconType = d.type === 'host' ? 'host' :
            (d.type === 'core' ? 'core' :
                d.type === 'aggregate' ? 'aggregate' :
                    d.type === 'tor' ? 'tor' : 'switch');

        const icon = svgIcons[iconType];

        // Background circle for easier selection and consistent coloring
        node.append('circle')
            .attr('class', 'node')
            .attr('r', 14)
            .attr('fill', getNodeColor(d.type));

        // The actual icon path
        node.append('path')
            .attr('d', icon.path)
            .attr('class', 'node-icon')
            .attr('fill', '#ffffff')  // White icon
            .attr('stroke', '#000000')  // Black outline
            .attr('stroke-width', 0.5)
            .attr('transform', `translate(-12, -12)`);  // Center the icon
    });

    // Add node labels
    const nodeLabels = svg.select('g').selectAll('.node-label')
        .data(graph.nodes)
        .enter()
        .append('text')
        .attr('class', 'node-label')
        .attr('dx', 16)
        .attr('dy', 4)
        .text(d => d.id)
        .style('display', showLabels ? 'block' : 'none');

    // Add bandwidth labels to links
    const linkLabels = svg.select('g').selectAll('.bandwidth-label')
        .data(graph.links.filter(d => d.properties.bw))
        .enter()
        .append('text')
        .attr('class', 'bandwidth-label')
        .text(d => `${d.properties.bw} Mbps`)
        .style('display', showLabels ? 'block' : 'none');

    // Add click event to nodes
    nodeGroup.on('click', (event, d) => {
        // Clear previous selection
        svg.selectAll('.selected').classed('selected', false);

        // Mark this node as selected
        d3.select(event.currentTarget).select('.node').classed('selected', true);

        // Update selection tracking
        selectedNode = d;
        selectedLink = null;

        // Show node details
        showNodeDetails(d);

        // Stop propagation to prevent other click events
        event.stopPropagation();
    });

    // Add click handler to SVG background to clear selection
    svg.on('click', (event) => {
        if (event.target === svg.node() || event.target.classList.contains('grid-line')) {
            // Clear selection
            svg.selectAll('.selected').classed('selected', false);
            selectedNode = null;
            selectedLink = null;

            // Update details panel
            document.getElementById('details-panel').innerHTML = `
                <h3>Node Details</h3>
                <p>Click on a node to see details.</p>
            `;
        }
    });

    // Update simulation on each tick
    simulation.on('tick', () => {
        // For fat tree layout, ensure Y positions stay fixed
        if (currentLayout === 'fattree') {
            graph.nodes.forEach(d => {
                // Keep Y position fixed for fat tree layout
                if (d.fy !== undefined) {
                    d.y = d.fy;
                }
            });
        }

        // Snap nodes to grid if enabled
        if (snapToGrid) {
            graph.nodes.forEach(d => {
                // Only snap nodes that are not being dragged
                if (!d.isDragging) {
                    d.x = Math.round(d.x / gridSize) * gridSize;
                    if (currentLayout !== 'fattree') {
                        d.y = Math.round(d.y / gridSize) * gridSize;
                    }
                }
            });
        }

        link
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);

        nodeGroup
            .attr('transform', d => `translate(${d.x}, ${d.y})`);

        nodeLabels
            .attr('x', d => d.x)
            .attr('y', d => d.y);

        linkLabels
            .attr('x', d => (d.source.x + d.target.x) / 2)
            .attr('y', d => (d.source.y + d.target.y) / 2);
    });
}

// Helper function to get node color based on type
function getNodeColor(type) {
    switch (type) {
        case 'host': return '#2ca02c';      // Green
        case 'tor': return '#1f77b4';       // Blue
        case 'aggregate': return '#ff7f0e'; // Orange
        case 'core': return '#d62728';      // Red
        default: return '#7f7f7f';          // Gray for unknown
    }
}

// Apply Fat Tree layout with true symmetrical placement
function applyFatTreeLayout(graph) {
    // Calculate dynamic spacing based on topology size
    const totalNodes = graph.nodes.length;
    const hostCount = graph.nodes.filter(n => n.type === 'host').length;

    // Adaptive layer heights and spacing based on topology size
    let layerSpacing;
    if (totalNodes > 200) {
        // Large topology - more aggressive spacing
        layerSpacing = 0.22;
    } else if (totalNodes > 100) {
        // Medium topology
        layerSpacing = 0.25;
    } else {
        // Small topology
        layerSpacing = 0.28;
    }

    // Pre-calculate and snap layer heights to grid to ensure consistency
    const coreLayerY = Math.round((height * 0.1) / gridSize) * gridSize;
    const aggregateLayerY = Math.round((height * (0.1 + layerSpacing)) / gridSize) * gridSize;
    const torLayerY = Math.round((height * (0.1 + layerSpacing * 2)) / gridSize) * gridSize;
    const hostLayerY = Math.round((height * (0.1 + layerSpacing * 3)) / gridSize) * gridSize;

    // Get nodes by type and sort them
    const coreNodes = graph.nodes.filter(n => n.type === 'core');
    const aggregateNodes = graph.nodes.filter(n => n.type === 'aggregate');
    const torNodes = graph.nodes.filter(n => n.type === 'tor');
    const hostNodes = graph.nodes.filter(n => n.type === 'host');

    // Sort all nodes by ID numerically
    const sortByNumId = (a, b) => {
        const aNum = parseInt(a.id.match(/\d+/)[0] || 0);
        const bNum = parseInt(b.id.match(/\d+/)[0] || 0);
        return aNum - bNum;
    };

    const sortedCoreNodes = [...coreNodes].sort(sortByNumId);
    const sortedAggregateNodes = [...aggregateNodes].sort(sortByNumId);
    const sortedTorNodes = [...torNodes].sort(sortByNumId);
    const sortedHostNodes = [...hostNodes].sort(sortByNumId);

    // Position all layers with appropriate spacing for the topology size
    positionLayerSymmetrically(sortedCoreNodes, coreLayerY, totalNodes);
    positionLayerSymmetrically(sortedAggregateNodes, aggregateLayerY, totalNodes);
    positionLayerSymmetrically(sortedTorNodes, torLayerY, totalNodes);

    // Position hosts symmetrically under their ToR switches
    positionHostsUnderToRs(sortedHostNodes, sortedTorNodes, hostLayerY, totalNodes);
}

// Position a layer of nodes with perfect symmetry
function positionLayerSymmetrically(nodes, yPosition, totalNodes = 0) {
    if (nodes.length === 0) return;

    // Dynamic margin based on topology size
    let margin;
    if (totalNodes > 200) {
        margin = 20; // Smaller margins for large topologies to maximize space
    } else if (totalNodes > 100) {
        margin = 30;
    } else {
        margin = 40;
    }

    const availableWidth = width - (2 * margin);

    if (nodes.length === 1) {
        // Single node - center it
        nodes[0].layoutX = width / 2;
        nodes[0].layoutY = yPosition; // All nodes in layer get the EXACT same Y
    } else {
        // Multiple nodes - calculate minimum spacing based on topology size
        let minSpacing;
        if (totalNodes > 200) {
            minSpacing = 35; // Tighter spacing for very large topologies
        } else if (totalNodes > 100) {
            minSpacing = 45;
        } else {
            minSpacing = 60;
        }

        // Calculate required width for all nodes with minimum spacing
        const requiredWidth = (nodes.length - 1) * minSpacing;

        if (requiredWidth <= availableWidth) {
            // Nodes fit with minimum spacing - distribute evenly
            const actualSpacing = availableWidth / (nodes.length - 1);

            nodes.forEach((node, index) => {
                node.layoutX = margin + (index * actualSpacing);
                node.layoutY = yPosition; // All nodes in layer get the EXACT same Y
            });
        } else {
            // Nodes don't fit with minimum spacing - use tight spacing
            const tightSpacing = availableWidth / (nodes.length - 1);

            nodes.forEach((node, index) => {
                node.layoutX = margin + (index * tightSpacing);
                node.layoutY = yPosition; // All nodes in layer get the EXACT same Y
            });
        }
    }
}

// Position hosts symmetrically under their ToR switches
function positionHostsUnderToRs(hosts, tors, yPosition, totalNodes = 0) {
    // Create mapping of ToR to hosts
    const torToHostsMap = new Map();

    // Build the host to ToR mapping first
    const hostToTorMap = buildHostToTorMap(graph);

    // Group hosts by their ToR
    hosts.forEach(host => {
        const torId = hostToTorMap.get(host.id);
        if (torId) {
            if (!torToHostsMap.has(torId)) {
                torToHostsMap.set(torId, []);
            }
            torToHostsMap.get(torId).push(host);
        }
    });

    // Dynamic host spacing based on topology size
    let hostSpacing;
    if (totalNodes > 200) {
        hostSpacing = 35; // Tighter spacing for large topologies
    } else if (totalNodes > 100) {
        hostSpacing = 40;
    } else {
        hostSpacing = 50;
    }

    // Position hosts under each ToR
    tors.forEach(tor => {
        const connectedHosts = torToHostsMap.get(tor.id) || [];
        if (connectedHosts.length === 0) return;

        // Sort hosts numerically by ID for consistent ordering
        connectedHosts.sort((a, b) => {
            const aNum = parseInt(a.id.match(/\d+/)[0] || 0);
            const bNum = parseInt(b.id.match(/\d+/)[0] || 0);
            return aNum - bNum;
        });

        // Calculate host row arrangement
        const maxHostsPerRow = Math.floor(hostSpacing > 40 ? 4 : 6); // More hosts per row for larger topologies

        if (connectedHosts.length <= maxHostsPerRow) {
            // Single row of hosts
            const totalWidth = (connectedHosts.length - 1) * hostSpacing;
            const startX = tor.layoutX - totalWidth / 2;

            connectedHosts.forEach((host, index) => {
                host.layoutX = startX + (index * hostSpacing);
                host.layoutY = yPosition;
            });
        } else {
            // Multiple rows of hosts
            const rows = Math.ceil(connectedHosts.length / maxHostsPerRow);
            const rowSpacing = 35;

            connectedHosts.forEach((host, index) => {
                const row = Math.floor(index / maxHostsPerRow);
                const col = index % maxHostsPerRow;
                const hostsInRow = Math.min(maxHostsPerRow, connectedHosts.length - (row * maxHostsPerRow));

                const rowWidth = (hostsInRow - 1) * hostSpacing;
                const rowStartX = tor.layoutX - rowWidth / 2;

                host.layoutX = rowStartX + (col * hostSpacing);

                // Center all rows vertically
                const totalHeight = (rows - 1) * rowSpacing;
                host.layoutY = yPosition + (row * rowSpacing) - (totalHeight / 2);
            });
        }
    });

    // Handle any unmapped hosts (shouldn't happen in a proper fat tree)
    const unmappedHosts = hosts.filter(host => !hostToTorMap.has(host.id));
    if (unmappedHosts.length > 0) {
        const unmappedY = Math.round((yPosition + 40) / gridSize) * gridSize;
        positionLayerSymmetrically(unmappedHosts, unmappedY, totalNodes);
    }
}

// Apply Binary Tree layout
function applyBinaryTreeLayout(graph) {
    // Extract node levels from names (a, b, c, d)
    const levels = {};

    graph.nodes.forEach(node => {
        const prefix = node.id.charAt(0);
        if (!levels[prefix]) {
            levels[prefix] = [];
        }
        levels[prefix].push(node);
    });

    // Sort levels alphabetically (a, b, c, d) for top-down layout
    const sortedLevels = Object.keys(levels).sort();

    // Calculate vertical distribution
    const levelCount = sortedLevels.length;
    const verticalSpacing = height / (levelCount + 1);

    // Position each level
    sortedLevels.forEach((level, levelIndex) => {
        const nodesInLevel = levels[level].sort((a, b) => {
            // Extract numeric part for natural sorting
            const aNum = parseInt(a.id.match(/\d+/)[0] || 0);
            const bNum = parseInt(b.id.match(/\d+/)[0] || 0);
            return aNum - bNum;
        });

        // Pre-snap Y positions to grid for consistency
        const rawYPosition = (levelIndex + 1) * verticalSpacing;
        const yPosition = Math.round(rawYPosition / gridSize) * gridSize;

        positionNodesLinearly(nodesInLevel, width - 80, 40, yPosition);
    });

    // Handle hosts separately if they exist
    const hosts = graph.nodes.filter(n => n.type === 'host');
    if (hosts.length > 0) {
        // Position hosts at the bottom - pre-snap to grid
        const rawHostLevelY = height * 0.9; // Bottom of the screen
        const hostLevelY = Math.round(rawHostLevelY / gridSize) * gridSize;

        // Group hosts by their connected switch
        const hostToSwitchMap = new Map();

        // Find leaf nodes connected to each host
        graph.links.forEach(link => {
            const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
            const targetId = typeof link.target === 'object' ? link.target.id : link.target;

            if (sourceId.charAt(0) === 'h') {
                hostToSwitchMap.set(sourceId, targetId);
            }
            else if (targetId.charAt(0) === 'h') {
                hostToSwitchMap.set(targetId, sourceId);
            }
        });

        // Build a reverse map (switch to hosts)
        const switchToHostsMap = new Map();
        hostToSwitchMap.forEach((switchId, hostId) => {
            if (!switchToHostsMap.has(switchId)) {
                switchToHostsMap.set(switchId, []);
            }
            const host = hosts.find(h => h.id === hostId);
            if (host) {
                switchToHostsMap.get(switchId).push(host);
            }
        });

        // Position hosts under their switches
        graph.nodes.forEach(node => {
            const connectedHosts = switchToHostsMap.get(node.id) || [];
            if (connectedHosts.length > 0) {
                const totalWidth = 120; // Space for hosts
                const spacing = totalWidth / (connectedHosts.length + 1);

                connectedHosts.forEach((host, index) => {
                    host.layoutX = node.layoutX - totalWidth / 2 + (index + 1) * spacing;
                    host.layoutY = hostLevelY;
                });
            }
        });

        // For any hosts not mapped to switches, position them linearly
        const unmappedHosts = hosts.filter(host => !hostToSwitchMap.has(host.id));
        positionNodesLinearly(unmappedHosts, width - 80, 40, hostLevelY);
    }
}

// Apply Linear layout for simple topologies
function applyLinearLayout(graph) {
    // Identify different node types
    const hosts = graph.nodes.filter(n => n.type === 'host');
    const switches = graph.nodes.filter(n => n.type !== 'host');

    // Position switches in the middle - pre-snap to grid
    const rawSwitchLayerY = height * 0.5;
    const switchLayerY = Math.round(rawSwitchLayerY / gridSize) * gridSize;
    positionNodesLinearly(switches, width - 80, 40, switchLayerY);

    // Position hosts at the bottom - pre-snap to grid
    const rawHostLayerY = height * 0.8;
    const hostLayerY = Math.round(rawHostLayerY / gridSize) * gridSize;

    // Group hosts by their connected switch
    const hostToSwitchMap = new Map();

    // Find switches connected to each host
    graph.links.forEach(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;

        if (sourceId.charAt(0) === 'h' && targetId.charAt(0) === 's') {
            hostToSwitchMap.set(sourceId, targetId);
        }
        else if (targetId.charAt(0) === 'h' && sourceId.charAt(0) === 's') {
            hostToSwitchMap.set(targetId, sourceId);
        }
    });

    // Build a reverse map (switch to hosts)
    const switchToHostsMap = new Map();
    hostToSwitchMap.forEach((switchId, hostId) => {
        if (!switchToHostsMap.has(switchId)) {
            switchToHostsMap.set(switchId, []);
        }
        const host = hosts.find(h => h.id === hostId);
        if (host) {
            switchToHostsMap.get(switchId).push(host);
        }
    });

    // Position hosts under their switches
    switches.forEach(switchNode => {
        const connectedHosts = switchToHostsMap.get(switchNode.id) || [];
        if (connectedHosts.length > 0) {
            const totalWidth = 120; // Space for hosts
            const spacing = totalWidth / (connectedHosts.length + 1);

            connectedHosts.forEach((host, index) => {
                host.layoutX = switchNode.layoutX - totalWidth / 2 + (index + 1) * spacing;
                host.layoutY = hostLayerY;
            });
        }
    });

    // For any hosts not mapped to switches, position them linearly
    const unmappedHosts = hosts.filter(host => !hostToSwitchMap.has(host.id));
    positionNodesLinearly(unmappedHosts, width - 80, 40, hostLayerY);
}

// Apply Force-Directed layout for unknown topologies
function applyForceDirectedLayout(graph) {
    // Center of the svg
    const centerX = width / 2;
    const centerY = height / 2;

    // Set initial positions randomly around the center
    graph.nodes.forEach(node => {
        node.layoutX = centerX + (Math.random() - 0.5) * width * 0.8;
        node.layoutY = centerY + (Math.random() - 0.5) * height * 0.8;
    });
}

// Evenly distribute nodes in a strict linear fashion
function positionNodesLinearly(nodes, availableWidth, startX, yPosition) {
    if (nodes.length === 0) return;

    // For a single node, center it
    if (nodes.length === 1) {
        nodes[0].layoutX = startX + availableWidth / 2;
        nodes[0].layoutY = yPosition;
        return;
    }

    // Calculate spacing between nodes
    const spacing = availableWidth / (nodes.length - 1);

    // Position each node in a straight line
    nodes.forEach((node, index) => {
        node.layoutX = startX + (spacing * index);
        node.layoutY = yPosition;
    });
}

// Build a map of hosts to their connected ToR switches
function buildHostToTorMap(graph) {
    const hostToRackMap = new Map();

    // Find ToR switches connected to each host
    graph.links.forEach(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;

        // If link connects a host to a ToR switch
        if (sourceId.charAt(0) === 'h' &&
            (targetId.charAt(0) === 't' || targetId.charAt(0) === 'd')) {
            hostToRackMap.set(sourceId, targetId);
        }
        else if (targetId.charAt(0) === 'h' &&
            (sourceId.charAt(0) === 't' || sourceId.charAt(0) === 'd')) {
            hostToRackMap.set(targetId, sourceId);
        }
    });

    return hostToRackMap;
}

// Export topology visualization as PNG or JPEG
function exportTopology(format) {
    // Create a temporary white background for better image quality
    const tempBg = svg.insert('rect', ':first-child')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('fill', 'white');

    // Get the SVG element and all its content
    const svgElement = document.querySelector('#graph-container svg');
    const svgData = new XMLSerializer().serializeToString(svgElement);

    // Create a canvas to draw the SVG
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Get the actual size of the SVG
    const rect = svgElement.getBoundingClientRect();

    // Set canvas size to match SVG viewport or use default size
    canvas.width = rect.width || 1200;
    canvas.height = rect.height || 800;

    // Create an image from SVG data
    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = function () {
        // Fill canvas with white background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw the SVG image on canvas
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Convert to image format
        const imageFormat = format === 'jpeg' ? 'image/jpeg' : 'image/png';
        const quality = format === 'jpeg' ? 0.95 : undefined; // Higher quality for JPEG

        const dataURL = canvas.toDataURL(imageFormat, quality);

        // Create download link
        const link = document.createElement('a');
        link.download = `network-topology.${format}`;
        link.href = dataURL;
        link.click();

        // Clean up
        URL.revokeObjectURL(url);
        tempBg.remove();
    };

    img.onerror = function () {
        alert('Error exporting image. This might be due to browser security restrictions.');
        tempBg.remove();
        URL.revokeObjectURL(url);
    };

    img.src = url;
}

// Reset the view by reloading the current topology
function resetView() {
    if (!currentTopology || !graph) return;

    // Simply reload the current topology to reset everything
    loadTopology(currentTopology);

    // Show a brief visual feedback to indicate the reset
    const button = document.querySelector('#reset-view-btn button');
    const originalText = button.textContent;
    button.textContent = 'Reset Complete';
    button.style.backgroundColor = '#4CAF50';

    // Restore the button after a short delay
    setTimeout(() => {
        button.textContent = originalText;
        button.style.backgroundColor = '';
    }, 1000);
}

// Auto-zoom to fit the entire topology on screen with efficient space usage
function autoZoomToFit(graph) {
    if (!graph || graph.nodes.length === 0) return;

    // Calculate the actual bounding box of all nodes
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    graph.nodes.forEach(node => {
        minX = Math.min(minX, node.x || 0);
        minY = Math.min(minY, node.y || 0);
        maxX = Math.max(maxX, node.x || 0);
        maxY = Math.max(maxY, node.y || 0);
    });

    // For fat trees, check if we need special handling
    if (currentLayout === 'fattree') {
        const hostCount = graph.nodes.filter(n => n.type === 'host').length;

        // Check actual width of hosts
        const hosts = graph.nodes.filter(n => n.type === 'host');
        let hostMinX = Infinity, hostMaxX = -Infinity;
        hosts.forEach(host => {
            hostMinX = Math.min(hostMinX, host.x || 0);
            hostMaxX = Math.max(hostMaxX, host.x || 0);
        });

        // Calculate actual host width
        const actualHostWidth = hostMaxX - hostMinX;

        // Calculate padding based on topology size and screen width
        let basepadding;
        if (hostCount > 128) {
            basepadding = Math.min(50, width * 0.05); // 5% of screen width or 50px, whichever is smaller
        } else if (hostCount > 64) {
            basepadding = Math.min(80, width * 0.08); // 8% of screen width  
        } else {
            basepadding = Math.min(100, width * 0.1); // 10% of screen width
        }

        // Use the actual bounding box plus modest padding
        minX -= basepadding;
        minY -= basepadding;
        maxX += basepadding;
        maxY += basepadding;

        // Ensure we don't zoom out too far for large topologies
        const graphWidth = maxX - minX;
        const graphHeight = maxY - minY;

        const scaleX = width / graphWidth;
        const scaleY = height / graphHeight;
        const scale = Math.min(scaleX, scaleY, 1.2); // Cap scale at 1.2 to avoid zooming in too much

        // Calculate center
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        // Apply the zoom transform without animation
        svg.call(
            svg.zoom.transform,
            d3.zoomIdentity
                .translate(width / 2, height / 2)
                .scale(scale)
                .translate(-centerX, -centerY)
        );
    } else {
        // For other layouts, use standard padding
        const padding = 60;
        minX -= padding;
        minY -= padding;
        maxX += padding;
        maxY += padding;

        // Calculate the required scale to fit the graph
        const graphWidth = maxX - minX;
        const graphHeight = maxY - minY;

        const scaleX = width / graphWidth;
        const scaleY = height / graphHeight;
        const scale = Math.min(scaleX, scaleY, 2); // Limit max scale to 2x

        // Calculate the center of the graph
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        // Apply the zoom transform without animation
        svg.call(
            svg.zoom.transform,
            d3.zoomIdentity
                .translate(width / 2, height / 2)
                .scale(scale)
                .translate(-centerX, -centerY)
        );
    }
}

// Show node details in the details panel
function showNodeDetails(node) {
    const detailsPanel = document.getElementById('details-panel');
    const nodeTypeMap = {
        'host': 'Host',
        'tor': 'Top of Rack (ToR) Switch',
        'aggregate': 'Aggregate Switch',
        'core': 'Core Switch',
        'switch': 'Switch'
    };

    let html = `<h3>Node Details: ${node.id}</h3>`;
    html += `<p><strong>Type:</strong> ${nodeTypeMap[node.type] || node.type}</p>`;
    html += `<p><strong>Position:</strong> Grid (${Math.round(node.x / gridSize)}, ${Math.round(node.y / gridSize)})</p>`;

    // Show configuration properties
    html += `<p><strong>Configuration:</strong></p>`;
    if (Object.keys(node.config).length === 0) {
        html += `<p>No specific configuration.</p>`;
    } else {
        html += `<pre>${JSON.stringify(node.config, null, 2)}</pre>`;
    }

    // Show connected links with port information
    html += `<p><strong>Connected Links:</strong></p>`;
    const connectedLinks = graph.links.filter(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        return sourceId === node.id || targetId === node.id;
    });

    if (connectedLinks.length === 0) {
        html += `<p>No connections.</p>`;
    } else {
        html += `<ul>`;
        connectedLinks.forEach(link => {
            const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
            const targetId = typeof link.target === 'object' ? link.target.id : link.target;
            const otherEnd = sourceId === node.id ? targetId : sourceId;

            // Get type of the other end
            const otherNode = graph.nodes.find(n => n.id === otherEnd);
            const otherType = otherNode ? nodeTypeMap[otherNode.type] || otherNode.type : 'unknown';

            // Get port numbers
            let thisPort, otherPort;
            if (sourceId === node.id) {
                thisPort = link.sourcePort;
                otherPort = link.targetPort;
            } else {
                thisPort = link.targetPort;
                otherPort = link.sourcePort;
            }

            // Format bandwidth properties
            let bandwidth = '';
            if (link.properties && link.properties.bw) {
                bandwidth = ` (Bandwidth: ${link.properties.bw} Mbps)`;
            }

            html += `<li>Port ${thisPort} connected to <strong>${otherEnd}</strong> (${otherType}) port ${otherPort}${bandwidth}</li>`;
        });
        html += `</ul>`;
    }

    detailsPanel.innerHTML = html;
}

// Show link details in the details panel
function showLinkDetails(link) {
    const detailsPanel = document.getElementById('details-panel');
    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
    const targetId = typeof link.target === 'object' ? link.target.id : link.target;

    // Get node types
    const sourceNode = graph.nodes.find(n => n.id === sourceId);
    const targetNode = graph.nodes.find(n => n.id === targetId);

    const nodeTypeMap = {
        'host': 'Host',
        'tor': 'Top of Rack (ToR) Switch',
        'aggregate': 'Aggregate Switch',
        'core': 'Core Switch',
        'switch': 'Switch'
    };

    const sourceType = sourceNode ? nodeTypeMap[sourceNode.type] || sourceNode.type : 'unknown';
    const targetType = targetNode ? nodeTypeMap[targetNode.type] || targetNode.type : 'unknown';

    let html = `<h3>Link Details</h3>`;
    html += `<p><strong>Connection:</strong> ${sourceId} (${sourceType}) ↔ ${targetId} (${targetType})</p>`;
    html += `<p><strong>Ports:</strong> ${sourceId}:${link.sourcePort} ↔ ${targetId}:${link.targetPort}</p>`;

    // Show bandwidth if available
    if (link.properties && link.properties.bw) {
        html += `<p><strong>Bandwidth:</strong> ${link.properties.bw} Mbps</p>`;
    } else {
        html += `<p><strong>Bandwidth:</strong> Default</p>`;
    }

    // Show any other properties
    if (link.properties && Object.keys(link.properties).length > 0) {
        html += `<p><strong>Properties:</strong></p>`;
        html += `<pre>${JSON.stringify(link.properties, null, 2)}</pre>`;
    }

    detailsPanel.innerHTML = html;
}

// Update topology information in the sidebar
function updateTopologyInfo(topology, graph) {
    const topologyInfo = document.getElementById('topology-info');
    const propertiesInfo = document.getElementById('properties-info');

    // Determine topology type
    let topologyType = "Unknown";
    switch (currentLayout) {
        case 'fattree':
            topologyType = "Fat Tree";
            break;
        case 'binary':
            topologyType = "Binary Tree";
            break;
        case 'linear':
            topologyType = "Linear";
            break;
        case 'force':
            topologyType = "Custom";
            break;
    }

    // Count node types
    const nodeTypes = {};
    graph.nodes.forEach(node => {
        nodeTypes[node.type] = (nodeTypes[node.type] || 0) + 1;
    });

    let topologyHtml = `
        <p><strong>Topology Type:</strong> ${topologyType}</p>
    `;

    // Add counts for each node type
    for (const type in nodeTypes) {
        const displayType = type.charAt(0).toUpperCase() + type.slice(1); // Capitalize
        topologyHtml += `<p><strong>${displayType}s:</strong> ${nodeTypes[type]}</p>`;
    }

    // Add link count
    topologyHtml += `<p><strong>Links:</strong> ${topology.links.length}</p>`;

    topologyInfo.innerHTML = topologyHtml;

    let propertiesHtml = `
        <p><strong>Assignment Strategy:</strong> ${topology.assignment_strategy || 'N/A'}</p>
        <p><strong>Auto ARP Tables:</strong> ${topology.auto_arp_tables !== undefined ? topology.auto_arp_tables : 'N/A'}</p>
        <p><strong>Default Queue Length:</strong> ${topology.default_queue_length !== undefined ? topology.default_queue_length : 'N/A'}</p>
    `;

    // Add any additional properties
    const additionalProps = ['p4_src', 'switch', 'compiler', 'pcap_dump', 'enable_log'];
    additionalProps.forEach(prop => {
        if (topology[prop] !== undefined) {
            const displayProp = prop.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            propertiesHtml += `<p><strong>${displayProp}:</strong> ${topology[prop]}</p>`;
        }
    });

    propertiesInfo.innerHTML = propertiesHtml;
}

// Drag functions
function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
    d.isDragging = true; // Set a flag that this node is being dragged
}

function dragged(event, d) {
    if (snapToGrid) {
        // Snap to grid when dragging
        d.fx = Math.round(event.x / gridSize) * gridSize;
        d.fy = Math.round(event.y / gridSize) * gridSize;
    } else {
        d.fx = event.x;
        d.fy = event.y;
    }
}

function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);

    // Keep the node fixed at its final position
    if (snapToGrid) {
        // Ensure it's properly snapped to grid
        d.x = Math.round(d.x / gridSize) * gridSize;
        d.y = Math.round(d.y / gridSize) * gridSize;
        // Keep node fixed at the snapped position
        d.fx = d.x;
        d.fy = d.y;
    } else {
        // Keep node fixed at its last position
        d.fx = d.x;
        d.fy = d.y;
    }

    d.isDragging = false; // Clear the dragging flag
}