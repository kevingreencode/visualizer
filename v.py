""" Author: Kevin Green 2025
    Program to visualize links
"""
import networkx as nx
import matplotlib.pyplot as plt
import numpy as np
import re

def natural_key(node):
    """sorting in natural order or else it looks ugly"""
    return [int(text) if text.isdigit() else text for text in re.split(r'(\d+)', node)]

def assign_positions(nodes, y_level, x_start=-5, x_end=5):
    """evenly space nodes"""
    if not nodes:
        return {}
    x_positions = np.linspace(x_start, x_end, len(nodes))  # Spread nodes evenly
    return {node: (x, y_level) for node, x in zip(sorted(nodes, key=natural_key), x_positions)}

def categorize_nodes(links):
    """categorizes nodes into core, aggregation, ToR, and hosts for coloring"""
    core_nodes, agg_nodes, tor_nodes, host_nodes = set(), set(), set(), set()
    
    for node1, node2, _ in links:
        for node in (node1, node2):
            if node.startswith("c"):
                core_nodes.add(node)
            elif node.startswith("a"):
                agg_nodes.add(node)
            elif node.startswith("t"):
                tor_nodes.add(node)
            elif node.startswith("h"):
                host_nodes.add(node)
    
    return core_nodes, agg_nodes, tor_nodes, host_nodes

def visualize_fattree(links):
    G = nx.Graph()
    edge_labels = {}

    for node1, node2, attributes in links:
        G.add_edge(node1, node2)
        edge_labels[(node1, node2)] = f"{attributes['bw']}Mbps"  # bandwidth labl

    core_nodes, agg_nodes, tor_nodes, host_nodes = categorize_nodes(links)

    """ positioning in layers """
    pos = {}
    pos.update(assign_positions(core_nodes, y_level=3))
    pos.update(assign_positions(agg_nodes, y_level=2))
    pos.update(assign_positions(tor_nodes, y_level=1))
    pos.update(assign_positions(host_nodes, y_level=0))


    node_colors = [
        "red" if node in core_nodes else
        "orange" if node in agg_nodes else
        "blue" if node in tor_nodes else
        "green"
        for node in G.nodes()
    ]

    plt.figure(figsize=(12, 6))
    nx.draw(G, pos, with_labels=True, node_color=node_colors, edge_color="gray",
            node_size=1000, font_size=8, font_color="black", font_weight="bold")

    """ bandwidth labels on edges """
    nx.draw_networkx_edge_labels(G, pos, edge_labels=edge_labels, font_size=6, font_color="black")

    plt.title("Fattree Topology Visualization", fontsize=12)
    plt.show()


links = [
    ["c1", "a1", {"bw": 2}], ["c1", "a3", {"bw": 2}], ["c1", "a5", {"bw": 2}], ["c1", "a7", {"bw": 2}],
    ["c2", "a1", {"bw": 2}], ["c2", "a3", {"bw": 2}], ["c2", "a5", {"bw": 2}], ["c2", "a7", {"bw": 2}],
    ["c3", "a2", {"bw": 2}], ["c3", "a4", {"bw": 2}], ["c3", "a6", {"bw": 2}], ["c3", "a8", {"bw": 2}],
    ["c4", "a2", {"bw": 2}], ["c4", "a4", {"bw": 2}], ["c4", "a6", {"bw": 2}], ["c4", "a8", {"bw": 2}],
    ["a1", "t1", {"bw": 2}], ["a1", "t2", {"bw": 2}], ["a2", "t1", {"bw": 2}], ["a2", "t2", {"bw": 2}],
    ["a3", "t3", {"bw": 2}], ["a3", "t4", {"bw": 2}], ["a4", "t3", {"bw": 2}], ["a4", "t4", {"bw": 2}],
    ["a5", "t5", {"bw": 2}], ["a5", "t6", {"bw": 2}], ["a6", "t5", {"bw": 2}], ["a6", "t6", {"bw": 2}],
    ["a7", "t7", {"bw": 2}], ["a7", "t8", {"bw": 2}], ["a8", "t7", {"bw": 2}], ["a8", "t8", {"bw": 2}],
    ["t1", "h1", {"bw": 2}], ["t1", "h2", {"bw": 2}], ["t2", "h3", {"bw": 2}], ["t2", "h4", {"bw": 2}],
    ["t3", "h5", {"bw": 2}], ["t3", "h6", {"bw": 2}], ["t4", "h7", {"bw": 2}], ["t4", "h8", {"bw": 2}],
    ["t5", "h9", {"bw": 2}], ["t5", "h10", {"bw": 2}], ["t6", "h11", {"bw": 2}], ["t6", "h12", {"bw": 2}],
    ["t7", "h13", {"bw": 2}], ["t7", "h14", {"bw": 2}], ["t8", "h15", {"bw": 2}], ["t8", "h16", {"bw": 2}]
]

visualize_fattree(links)