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
        { value: 'force', text: 'Force-Directed' }
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
    // Extract topology section
    currentTopology = data.topology || data;
    
    // Build graph structure
    graph = buildGraph(currentTopology);
    
    // Always auto-detect the topology type for newly loaded files
    const detectedType = detectTopologyType(graph, currentTopology);
    currentLayout = detectedType;
    
    // Update the dropdown to show the detected type
    const layoutSelector = document.getElementById('layout-selector');
    layoutSelector.value = detectedType;
    
    // Update UI with topology information
    updateTopologyInfo(currentTopology, graph);
    
    // Visualize the graph
    visualizeGraph(graph);
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
    const nodes = [];
    const links = [];
    
    // Add hosts to nodes
    for (const hostId in topology.hosts) {
        nodes.push({
            id: hostId,
            type: getNodeType(hostId, topology),
            config: topology.hosts[hostId],
            ports: {} // Store port assignments
        });
    }
    
    // Add switches to nodes
    for (const switchId in topology.switches) {
        nodes.push({
            id: switchId,
            type: getNodeType(switchId, topology),
            config: topology.switches[switchId],
            ports: {} // Store port assignments
        });
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
    
    return { nodes, links };
}

// Determine node type based on its id and topology context
function getNodeType(nodeId, topology) {
    const prefix = nodeId.charAt(0);
    
    // Standard naming conventions
    if (prefix === 'h') return 'host';
    if (prefix === 't') return 'tor';
    if (prefix === 'a') return 'aggregate';
    if (prefix === 'c') return 'core';
    
    // Handle other naming patterns
    if (prefix === 's') {
        // Always treat 's' prefixed nodes as generic switches
        return 'switch';
    }
    
    // Handle binary tree naming (a1, b1, etc.)
    if (['a', 'b', 'c', 'd'].includes(prefix)) {
        const level = prefix.charCodeAt(0) - 'a'.charCodeAt(0);
        
        // If we have d1-d8 type nodes connected to hosts, they're like ToR
        if (prefix === 'd') return 'tor';
        
        // If we have a1 type node at the top, it's like core
        if (prefix === 'a') return 'core';
        
        // Others are like aggregation switches
        return 'aggregate';
    }
    
    // Default case for any other node
    return 'switch';
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
    
    // Apply layout based on selected type
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
    
    // Snap initial positions to grid and fix Y positions for fat tree
    if (snapToGrid) {
        graph.nodes.forEach(node => {
            node.x = Math.round(node.layoutX / gridSize) * gridSize;
            node.y = Math.round(node.layoutY / gridSize) * gridSize;
            // For fat tree layout, prevent vertical movement by fixing Y position
            if (currentLayout === 'fattree') {
                node.fy = node.y;  // Fix Y position
            }
        });
    } else {
        graph.nodes.forEach(node => {
            node.x = node.layoutX;
            node.y = node.layoutY;
            // For fat tree layout, prevent vertical movement
            if (currentLayout === 'fattree') {
                node.fy = node.y;  // Fix Y position
            }
        });
    }
    
    // Auto-zoom to fit the topology
    autoZoomToFit(graph);
    
    // Set up force simulation with constraints for fat tree
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
    nodeGroup.each(function(d) {
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
        showNodeDetails(d);
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
    switch(type) {
        case 'host': return '#2ca02c';      // Green
        case 'tor': return '#1f77b4';       // Blue
        case 'aggregate': return '#ff7f0e'; // Orange
        case 'core': return '#d62728';      // Red
        default: return '#7f7f7f';          // Gray for unknown
    }
}

// Apply Fat Tree layout with true symmetrical placement
function applyFatTreeLayout(graph) {
    // Pre-calculate and snap layer heights to grid to ensure consistency
    const coreLayerY = Math.round((height * 0.15) / gridSize) * gridSize;     
    const aggregateLayerY = Math.round((height * 0.38) / gridSize) * gridSize; 
    const torLayerY = Math.round((height * 0.62) / gridSize) * gridSize;      
    const hostLayerY = Math.round((height * 0.85) / gridSize) * gridSize;   
    
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
    
    // Position all layers with perfect symmetry
    positionLayerSymmetrically(sortedCoreNodes, coreLayerY);
    positionLayerSymmetrically(sortedAggregateNodes, aggregateLayerY);
    positionLayerSymmetrically(sortedTorNodes, torLayerY);
    
    // Position hosts symmetrically under their ToR switches
    positionHostsUnderToRs(sortedHostNodes, sortedTorNodes, hostLayerY);
}

// Position a layer of nodes with perfect symmetry
function positionLayerSymmetrically(nodes, yPosition) {
    if (nodes.length === 0) return;
    
    const margin = 40;
    const availableWidth = width - (2 * margin);
    
    if (nodes.length === 1) {
        // Single node - center it
        nodes[0].layoutX = width / 2;
        nodes[0].layoutY = yPosition; // All nodes in layer get the EXACT same Y
    } else {
        // Multiple nodes - distribute evenly
        // Calculate the spacing to use the full width
        const spacing = availableWidth / (nodes.length - 1);
        
        nodes.forEach((node, index) => {
            node.layoutX = margin + (index * spacing);
            node.layoutY = yPosition; // All nodes in layer get the EXACT same Y
        });
    }
}

// Position hosts symmetrically under their ToR switches
function positionHostsUnderToRs(hosts, tors, yPosition) {
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
        
        // Calculate the horizontal space for hosts under this ToR
        const hostSpacing = 50; // Increased spacing to prevent overlap
        const minTorDistance = 100; // Minimum distance from ToR center
        
        if (connectedHosts.length === 1) {
            // Single host - center under ToR
            connectedHosts[0].layoutX = tor.layoutX;
            connectedHosts[0].layoutY = yPosition; // All hosts get the EXACT same Y
        } else if (connectedHosts.length === 2) {
            // Two hosts - place symmetrically on either side with adequate spacing
            const offset = Math.max(hostSpacing / 2, minTorDistance);
            connectedHosts[0].layoutX = tor.layoutX - offset;
            connectedHosts[1].layoutX = tor.layoutX + offset;
            connectedHosts.forEach(host => host.layoutY = yPosition); // All hosts get the EXACT same Y
        } else {
            // Multiple hosts - arrange symmetrically with proper spacing
            const totalWidth = (connectedHosts.length - 1) * hostSpacing;
            const startX = tor.layoutX - totalWidth / 2;
            
            connectedHosts.forEach((host, index) => {
                host.layoutX = startX + (index * hostSpacing);
                host.layoutY = yPosition; // All hosts get the EXACT same Y
            });
        }
    });
    
    // Handle any unmapped hosts (shouldn't happen in a proper fat tree)
    const unmappedHosts = hosts.filter(host => !hostToTorMap.has(host.id));
    if (unmappedHosts.length > 0) {
        const unmappedY = Math.round((yPosition + 40) / gridSize) * gridSize;
        positionLayerSymmetrically(unmappedHosts, unmappedY);
    }
}

// Position nodes symmetrically across the available width
function positionNodesSymmetrically(nodes, containerWidth, yPosition) {
    if (nodes.length === 0) return;
    
    const margin = 30;
    const usableWidth = containerWidth - (margin * 2);
    const minSpacing = 50; // Minimum space between nodes
    
    // Calculate if nodes fit in one row
    const singleRowWidth = nodes.length * minSpacing;
    
    if (singleRowWidth <= usableWidth) {
        // All nodes fit in one row - center them
        if (nodes.length === 1) {
            nodes[0].layoutX = containerWidth / 2;
            nodes[0].layoutY = yPosition;
        } else {
            // Calculate equal spacing
            const spacing = usableWidth / (nodes.length - 1);
            nodes.forEach((node, index) => {
                node.layoutX = margin + (index * spacing);
                node.layoutY = yPosition;
            });
        }
    } else {
        // Multiple rows needed - arrange in a grid pattern
        const nodesPerRow = Math.floor(usableWidth / minSpacing);
        const rows = Math.ceil(nodes.length / nodesPerRow);
        const rowHeight = 40;
        
        nodes.forEach((node, index) => {
            const row = Math.floor(index / nodesPerRow);
            const col = index % nodesPerRow;
            const nodesInRow = Math.min(nodesPerRow, nodes.length - (row * nodesPerRow));
            
            // Center each row horizontally
            const rowWidth = (nodesInRow - 1) * minSpacing;
            const rowStartX = (containerWidth - rowWidth) / 2;
            
            node.layoutX = rowStartX + (col * minSpacing);
            
            // Center all rows vertically around the base Y position
            const totalHeight = (rows - 1) * rowHeight;
            node.layoutY = yPosition + (row * rowHeight) - (totalHeight / 2);
        });
    }
}

// Position hosts symmetrically under their ToR switches
function positionHostsSymmetrically(hosts, tors, hostToRackMap, yPosition) {
    // Create a map of ToR switches to their assigned hosts
    const torToHostsMap = new Map();
    
    hosts.forEach(host => {
        const connectedTor = hostToRackMap.get(host.id);
        if (connectedTor) {
            if (!torToHostsMap.has(connectedTor)) {
                torToHostsMap.set(connectedTor, []);
            }
            torToHostsMap.get(connectedTor).push(host);
        }
    });
    
    // Sort ToR switches by their X position
    const sortedTors = [...tors].sort((a, b) => a.layoutX - b.layoutX);
    
    // Calculate spacing between ToR switches
    if (sortedTors.length > 1) {
        const torSpacing = sortedTors[1].layoutX - sortedTors[0].layoutX;
        const hostSpacing = 35;
        
        sortedTors.forEach((tor) => {
            const connectedHosts = torToHostsMap.get(tor.id) || [];
            if (connectedHosts.length > 0) {
                // Determine max hosts that can fit in one row under this ToR
                const maxHostsPerRow = Math.floor(torSpacing / hostSpacing);
                const actualMaxHosts = Math.max(2, maxHostsPerRow); // At least 2 hosts per row
                
                if (connectedHosts.length <= actualMaxHosts) {
                    // Single row - center hosts under the ToR
                    const totalWidth = (connectedHosts.length - 1) * hostSpacing;
                    const startX = tor.layoutX - totalWidth / 2;
                    
                    connectedHosts.forEach((host, index) => {
                        host.layoutX = startX + (index * hostSpacing);
                        host.layoutY = yPosition;
                    });
                } else {
                    // Multiple rows - arrange in a grid centered under the ToR
                    const rows = Math.ceil(connectedHosts.length / actualMaxHosts);
                    const rowHeight = 35;
                    
                    connectedHosts.forEach((host, index) => {
                        const row = Math.floor(index / actualMaxHosts);
                        const col = index % actualMaxHosts;
                        const hostsInRow = Math.min(actualMaxHosts, connectedHosts.length - (row * actualMaxHosts));
                        
                        // Center each row under the ToR
                        const rowWidth = (hostsInRow - 1) * hostSpacing;
                        const rowStartX = tor.layoutX - rowWidth / 2;
                        
                        host.layoutX = rowStartX + (col * hostSpacing);
                        
                        // Center all rows vertically
                        const totalHeight = (rows - 1) * rowHeight;
                        host.layoutY = yPosition + (row * rowHeight) - (totalHeight / 2);
                    });
                }
            }
        });
    }
    
    // Handle unmapped hosts by centering them at the bottom
    const unmappedHosts = hosts.filter(host => !hostToRackMap.has(host.id));
    if (unmappedHosts.length > 0) {
        positionNodesSymmetrically(unmappedHosts, width, yPosition + 60);
    }
}

// Enhanced host positioning with more horizontal space
function positionHostsUnderTorsWithMoreSpace(hosts, tors, hostToRackMap, yPosition, usableWidth, margin) {
    // Create a map of tor switches to their assigned hosts
    const torToHostsMap = new Map();
    
    hosts.forEach(host => {
        const connectedTor = hostToRackMap.get(host.id);
        if (connectedTor) {
            if (!torToHostsMap.has(connectedTor)) {
                torToHostsMap.set(connectedTor, []);
            }
            torToHostsMap.get(connectedTor).push(host);
        }
    });
    
    // Calculate available space per ToR switch
    const torCount = tors.length;
    const spacePerTor = torCount > 0 ? usableWidth / torCount : usableWidth;
    
    // Sort ToR switches by their X position for consistent layout
    const sortedTors = [...tors].sort((a, b) => a.layoutX - b.layoutX);
    
    // Position hosts under their connected ToR switch
    sortedTors.forEach((tor, torIndex) => {
        const connectedHosts = torToHostsMap.get(tor.id) || [];
        if (connectedHosts.length > 0) {
            // Calculate the horizontal range for this ToR's hosts
            const torStartX = margin + torIndex * spacePerTor;
            const torEndX = torStartX + spacePerTor;
            const torCenterX = (torStartX + torEndX) / 2;
            
            // Adjust for edge cases
            const hostSpacing = 35;
            const maxHostsPerRow = Math.floor(spacePerTor / hostSpacing);
            const actualMaxHosts = Math.max(4, maxHostsPerRow); // Ensure at least 4 hosts per row
            
            if (connectedHosts.length <= actualMaxHosts) {
                // Single row of hosts
                const totalHostWidth = connectedHosts.length * hostSpacing;
                const hostStartX = torCenterX - totalHostWidth / 2;
                
                connectedHosts.forEach((host, index) => {
                    host.layoutX = hostStartX + (index + 0.5) * hostSpacing;
                    host.layoutY = yPosition;
                });
            } else {
                // Multiple rows of hosts
                const rows = Math.ceil(connectedHosts.length / actualMaxHosts);
                const verticalSpacing = 35;
                
                connectedHosts.forEach((host, index) => {
                    const row = Math.floor(index / actualMaxHosts);
                    const col = index % actualMaxHosts;
                    const hostsInRow = Math.min(actualMaxHosts, connectedHosts.length - (row * actualMaxHosts));
                    
                    const rowWidth = hostsInRow * hostSpacing;
                    const rowStartX = torCenterX - rowWidth / 2;
                    
                    host.layoutX = rowStartX + (col + 0.5) * hostSpacing;
                    
                    // Center multiple rows vertically around the base Y position
                    const totalRowsHeight = (rows - 1) * verticalSpacing;
                    const yOffset = row * verticalSpacing - totalRowsHeight / 2;
                    host.layoutY = yPosition + yOffset;
                });
            }
        }
    });
    
    // For hosts not mapped to any ToR, position them at the bottom
    const unmappedHosts = hosts.filter(host => !hostToRackMap.has(host.id));
    if (unmappedHosts.length > 0) {
        positionNodesWithSpacing(unmappedHosts, usableWidth, margin, yPosition + 50, 40);
    }
}

// Evenly distribute nodes with proper spacing
function positionNodesWithSpacing(nodes, availableWidth, startX, yPosition, nodeWidth) {
    if (nodes.length === 0) return;
    
    // Calculate if nodes will fit in one line
    const minRequiredWidth = nodes.length * nodeWidth;
    
    if (minRequiredWidth <= availableWidth) {
        // Nodes fit in one line - distribute evenly
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
    } else {
        // Too many nodes for one line - arrange in multiple rows
        const maxNodesPerRow = Math.floor(availableWidth / nodeWidth);
        const rows = Math.ceil(nodes.length / maxNodesPerRow);
        const rowHeight = 60; // Vertical spacing between rows
        
        nodes.forEach((node, index) => {
            const row = Math.floor(index / maxNodesPerRow);
            const col = index % maxNodesPerRow;
            const nodesInRow = Math.min(maxNodesPerRow, nodes.length - (row * maxNodesPerRow));
            
            // Calculate spacing for this specific row
            if (nodesInRow === 1) {
                node.layoutX = startX + availableWidth / 2;
            } else {
                const rowSpacing = availableWidth / (nodesInRow - 1);
                node.layoutX = startX + (col * rowSpacing);
            }
            
            // Adjust Y position for multiple rows, centering them around the base Y
            const totalRowsHeight = (rows - 1) * rowHeight;
            const yOffset = row * rowHeight - totalRowsHeight / 2;
            node.layoutY = yPosition + yOffset;
        });
    }
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

// Position hosts under their connected ToR switches
function positionHostsUnderTors(hosts, tors, hostToRackMap, yPosition) {
    // Create a map of tor switches to their assigned hosts
    const torToHostsMap = new Map();
    
    hosts.forEach(host => {
        const connectedTor = hostToRackMap.get(host.id);
        if (connectedTor) {
            if (!torToHostsMap.has(connectedTor)) {
                torToHostsMap.set(connectedTor, []);
            }
            torToHostsMap.get(connectedTor).push(host);
        }
    });
    
    // Calculate vertical offset for hosts to create subgroups
    const hostVerticalSpacing = 30;
    
    // Position hosts under their connected ToR switch
    tors.forEach(tor => {
        const connectedHosts = torToHostsMap.get(tor.id) || [];
        if (connectedHosts.length > 0) {
            // Calculate if hosts fit in one row under the ToR
            const hostSpacing = 40;
            const maxHostsPerRow = 6; // Maximum hosts per row
            
            if (connectedHosts.length <= maxHostsPerRow) {
                // Single row of hosts
                const totalWidth = Math.min(connectedHosts.length * hostSpacing, 240);
                const startX = tor.layoutX - totalWidth / 2;
                
                connectedHosts.forEach((host, index) => {
                    host.layoutX = startX + (index + 0.5) * hostSpacing;
                    host.layoutY = yPosition;
                });
            } else {
                // Multiple rows of hosts
                const rows = Math.ceil(connectedHosts.length / maxHostsPerRow);
                
                connectedHosts.forEach((host, index) => {
                    const row = Math.floor(index / maxHostsPerRow);
                    const col = index % maxHostsPerRow;
                    const hostsInRow = Math.min(maxHostsPerRow, connectedHosts.length - (row * maxHostsPerRow));
                    
                    const rowWidth = hostsInRow * hostSpacing;
                    const startX = tor.layoutX - rowWidth / 2;
                    
                    host.layoutX = startX + (col + 0.5) * hostSpacing;
                    host.layoutY = yPosition + row * hostVerticalSpacing;
                });
            }
        }
    });
    
    // For hosts not mapped to any ToR, position them at the bottom in a linear arrangement
    const unmappedHosts = hosts.filter(host => !hostToRackMap.has(host.id));
    if (unmappedHosts.length > 0) {
        positionNodesWithSpacing(unmappedHosts, width - 80, 40, yPosition + 40, 50);
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

// Update topology information in the sidebar
function updateTopologyInfo(topology, graph) {
    const topologyInfo = document.getElementById('topology-info');
    const propertiesInfo = document.getElementById('properties-info');
    
    // Determine topology type
    let topologyType = "Unknown";
    switch(currentLayout) {
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

// Auto-zoom to fit the entire topology on screen
function autoZoomToFit(graph) {
    if (!graph || graph.nodes.length === 0) return;
    
    // Calculate the bounding box of all nodes
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    graph.nodes.forEach(node => {
        minX = Math.min(minX, node.x || 0);
        minY = Math.min(minY, node.y || 0);
        maxX = Math.max(maxX, node.x || 0);
        maxY = Math.max(maxY, node.y || 0);
    });
    
    // Add padding around the graph
    const padding = 80;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;
    
    // Calculate the required scale to fit the graph
    const graphWidth = maxX - minX;
    const graphHeight = maxY - minY;
    const containerWidth = width;
    const containerHeight = height;
    
    const scaleX = containerWidth / graphWidth;
    const scaleY = containerHeight / graphHeight;
    const scale = Math.min(scaleX, scaleY, 2); // Limit max scale to 2x
    
    // Calculate the center of the graph
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    
    // Apply the zoom transform without animation (for initial load)
    svg.call(
        svg.zoom.transform,
        d3.zoomIdentity
            .translate(containerWidth / 2, containerHeight / 2)
            .scale(scale)
            .translate(-centerX, -centerY)
    );
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