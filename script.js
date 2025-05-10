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
        currentLayout = e.target.value;
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
    
    // Auto-detect topology type if set to auto
    if (currentLayout === 'auto') {
        const detectedType = detectTopologyType(graph, currentTopology);
        document.getElementById('layout-selector').value = detectedType;
        currentLayout = detectedType;
    }
    
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
    
    // Check for specific node naming patterns
    const hasFatTreeNaming = graph.nodes.some(n => 
        (n.id.charAt(0) === 'c' || n.id.charAt(0) === 'a' || n.id.charAt(0) === 't') && 
        !isNaN(parseInt(n.id.substring(1)))
    );
    
    const hasBinaryNaming = graph.nodes.some(n => 
        (n.id.charAt(0) === 'a' || n.id.charAt(0) === 'b' || n.id.charAt(0) === 'c' || n.id.charAt(0) === 'd') && 
        !isNaN(parseInt(n.id.substring(1)))
    );
    
    const hasSimpleNaming = graph.nodes.some(n => 
        n.id.charAt(0) === 's' && !isNaN(parseInt(n.id.substring(1)))
    );
    
    // Check for fat tree structure (core, aggregation, edge layers)
    if (hasFatTreeNaming && nodeTypeCount['core'] && nodeTypeCount['aggregate'] && nodeTypeCount['tor']) {
        return 'fattree';
    }
    
    // Check for binary tree structure
    if (hasBinaryNaming && graph.nodes.length > 10) {
        return 'binary';
    }
    
    // Check for simple linear topology
    if (hasSimpleNaming && graph.nodes.length < 10) {
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
            config: topology.hosts[hostId]
        });
    }
    
    // Add switches to nodes
    for (const switchId in topology.switches) {
        nodes.push({
            id: switchId,
            type: getNodeType(switchId, topology),
            config: topology.switches[switchId]
        });
    }
    
    // Add links
    topology.links.forEach(link => {
        const source = link[0];
        const target = link[1];
        let properties = {};
        
        // Check if link has properties
        if (link.length > 2) {
            properties = link[2];
        }
        
        links.push({
            source,
            target,
            properties
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
    
    svg = d3.select('#graph-container')
        .append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('viewBox', [0, 0, width, height])
        .call(d3.zoom().on('zoom', (event) => {
            g.attr('transform', event.transform);
        }));
    
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
    
    // Snap initial positions to grid
    if (snapToGrid) {
        graph.nodes.forEach(node => {
            node.x = Math.round(node.layoutX / gridSize) * gridSize;
            node.y = Math.round(node.layoutY / gridSize) * gridSize;
        });
    } else {
        graph.nodes.forEach(node => {
            node.x = node.layoutX;
            node.y = node.layoutY;
        });
    }
    
    // Set up force simulation
    simulation = d3.forceSimulation(graph.nodes)
        .force('link', d3.forceLink(graph.links).id(d => d.id).distance(100))
        .force('x', d3.forceX(d => d.x).strength(0.5))
        .force('y', d3.forceY(d => d.y).strength(0.5))
        .force('charge', d3.forceManyBody().strength(-50))
        .alphaDecay(0.1); // Faster settling
    
    // Create links
    const link = svg.select('g').selectAll('.link')
        .data(graph.links)
        .enter()
        .append('line')
        .attr('class', 'link')
        .attr('stroke-width', d => d.properties.bw ? Math.sqrt(d.properties.bw) * 0.5 : 1);
    
    // Create nodes
    const node = svg.select('g').selectAll('.node')
        .data(graph.nodes)
        .enter()
        .append('circle')
        .attr('class', 'node')
        .attr('r', d => d.type === 'host' ? 10 : 12) // Hosts slightly smaller
        .attr('fill', d => {
            // Color based on node type
            switch(d.type) {
                case 'host': return '#2ca02c';      // Green
                case 'tor': return '#1f77b4';       // Blue
                case 'aggregate': return '#ff7f0e'; // Orange
                case 'core': return '#d62728';      // Red
                default: return '#7f7f7f';          // Gray for unknown
            }
        })
        .call(d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended));
    
    // Add node labels
    const nodeLabels = svg.select('g').selectAll('.node-label')
        .data(graph.nodes)
        .enter()
        .append('text')
        .attr('class', 'node-label')
        .attr('dx', 12)
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
    node.on('click', (event, d) => {
        showNodeDetails(d);
    });
    
    // Update simulation on each tick
    simulation.on('tick', () => {
        // Snap nodes to grid if enabled
        if (snapToGrid) {
            graph.nodes.forEach(d => {
                // Only snap nodes that are not being dragged
                if (!d.isDragging) {
                    d.x = Math.round(d.x / gridSize) * gridSize;
                    d.y = Math.round(d.y / gridSize) * gridSize;
                }
            });
        }
        
        link
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);
        
        node
            .attr('cx', d => d.x)
            .attr('cy', d => d.y);
        
        nodeLabels
            .attr('x', d => d.x)
            .attr('y', d => d.y);
        
        linkLabels
            .attr('x', d => (d.source.x + d.target.x) / 2)
            .attr('y', d => (d.source.y + d.target.y) / 2);
    });
}

// Apply Fat Tree layout with strict linear layers
function applyFatTreeLayout(graph) {
    // Layer heights with increased spacing between layers for clarity
    const coreLayerY = height * 0.15;     // Core switches at top
    const aggregateLayerY = height * 0.4; // Aggregate switches below core
    const torLayerY = height * 0.65;      // ToR switches below aggregate
    const hostLayerY = height * 0.9;      // Hosts at bottom
    
    // Get nodes by type
    const coreNodes = graph.nodes.filter(n => n.type === 'core');
    const aggregateNodes = graph.nodes.filter(n => n.type === 'aggregate');
    const torNodes = graph.nodes.filter(n => n.type === 'tor');
    const hostNodes = graph.nodes.filter(n => n.type === 'host');
    
    // Sort nodes by ID for consistent positioning
    const sortNodesByID = (a, b) => {
        // Extract numeric part for natural sorting
        const aNum = parseInt(a.id.match(/\d+/)[0] || 0);
        const bNum = parseInt(b.id.match(/\d+/)[0] || 0);
        return aNum - bNum;
    };
    
    const sortedCoreNodes = [...coreNodes].sort(sortNodesByID);
    const sortedAggregateNodes = [...aggregateNodes].sort(sortNodesByID);
    const sortedTorNodes = [...torNodes].sort(sortNodesByID);
    const sortedHostNodes = [...hostNodes].sort(sortNodesByID);
    
    // Calculate horizontal spacing for strictly linear layouts
    const padding = 40; // Padding from edges
    const usableWidth = width - (padding * 2);

    // Position nodes with strict linear distribution in each layer
    positionNodesLinearly(sortedCoreNodes, usableWidth, padding, coreLayerY);
    positionNodesLinearly(sortedAggregateNodes, usableWidth, padding, aggregateLayerY);
    positionNodesLinearly(sortedTorNodes, usableWidth, padding, torLayerY);
    
    // Group hosts by their connected ToR switch
    const hostToRackMap = buildHostToTorMap(graph);
    positionHostsUnderTors(sortedHostNodes, sortedTorNodes, hostToRackMap, hostLayerY);
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
    
    // Position hosts under their connected ToR switch
    tors.forEach(tor => {
        const connectedHosts = torToHostsMap.get(tor.id) || [];
        if (connectedHosts.length > 0) {
            const totalWidth = 120; // Space to distribute hosts under each ToR
            const spacing = totalWidth / (connectedHosts.length + 1);
            
            connectedHosts.forEach((host, index) => {
                host.layoutX = tor.layoutX - totalWidth / 2 + (index + 1) * spacing;
                host.layoutY = yPosition;
            });
        }
    });
    
    // For hosts not mapped to any ToR, position them at the bottom
    const unmappedHosts = hosts.filter(host => !hostToRackMap.has(host.id));
    positionNodesLinearly(unmappedHosts, width - 80, 40, yPosition);
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
        
        const yPosition = (levelIndex + 1) * verticalSpacing;
        positionNodesLinearly(nodesInLevel, width - 80, 40, yPosition);
    });
    
    // Handle hosts separately if they exist
    const hosts = graph.nodes.filter(n => n.type === 'host');
    if (hosts.length > 0) {
        // Position hosts at the bottom
        const hostLevelY = height * 0.9; // Bottom of the screen
        
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
    
    // Position switches in the middle
    const switchLayerY = height * 0.5;
    positionNodesLinearly(switches, width - 80, 40, switchLayerY);
    
    // Position hosts at the bottom
    const hostLayerY = height * 0.8;
    
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
    
    // Show connected links
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
            
            // Format bandwidth properties
            let bandwidth = '';
            if (link.properties && link.properties.bw) {
                bandwidth = ` (Bandwidth: ${link.properties.bw} Mbps)`;
            }
            
            html += `<li>Connected to <strong>${otherEnd}</strong> (${otherType})${bandwidth}</li>`;
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

// Reset the view
function resetView() {
    if (!simulation) return;
    
    svg.transition().duration(750).call(
        d3.zoom().transform,
        d3.zoomIdentity,
        d3.zoomTransform(svg.node()).invert([width / 2, height / 2])
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
    
    // Final snap to grid
    if (snapToGrid) {
        d.x = Math.round(d.x / gridSize) * gridSize;
        d.y = Math.round(d.y / gridSize) * gridSize;
    }
    
    d.fx = null;
    d.fy = null;
    d.isDragging = false; // Clear the dragging flag
}