import React, { useMemo, useEffect } from 'react';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import './PeripheralGraph.css';

const PeripheralGraph = ({ equipmentDatabase, sessionCodes = [] }) => {
    // Filter database items that are in the current session
    const sessionItems = useMemo(() => {
        return equipmentDatabase.filter(item => sessionCodes.includes(item.barcode_id));
    }, [equipmentDatabase, sessionCodes]);

    // Create nodes and edges based ONLY on session items
    const { initialNodes, initialEdges } = useMemo(() => {
        const nodes = [];
        const edges = [];

        // Helper to check if an item is a computer
        const isComputer = (item) => {
            const type = item.equipment_type?.toLowerCase() || '';
            return type.includes('ordinateur') || type.includes('pc') || type.includes('laptop');
        };

        // Separate computers and peripherals within the session
        const computers = sessionItems.filter(isComputer);
        const peripherals = sessionItems.filter(item => !isComputer(item));

        // Track positioned nodes to avoid overlaps if possible
        let yOffset = 0;

        // 1. Position Computers
        computers.forEach((comp, i) => {
            nodes.push({
                id: comp.barcode_id,
                type: 'input',
                data: { label: `${comp.brand} ${comp.model} (${comp.barcode_id})` },
                position: { x: 250, y: yOffset * 300 + 50 },
                style: { background: '#e0e7ff', border: '1px solid #667eea', borderRadius: '8px', padding: '10px', width: 200 }
            });

            // Find peripherals connected to THIS computer that are ALSO in the session
            const connectedPeripherals = peripherals.filter(p => p.connected_to === comp.barcode_id);

            connectedPeripherals.forEach((p, j) => {
                nodes.push({
                    id: p.barcode_id,
                    data: { label: `${p.equipment_type}: ${p.brand} ${p.model}` },
                    position: { x: 50 + (j % 2) * 400, y: yOffset * 300 + 200 + (Math.floor(j / 2) * 100) },
                    style: { background: '#f0fdf4', border: '1px solid #10b981', borderRadius: '8px', padding: '10px', width: 180 }
                });

                // Create edge
                edges.push({
                    id: `e-${p.barcode_id}-${comp.barcode_id}`,
                    source: comp.barcode_id, // Computer is source (parent)
                    target: p.barcode_id,
                    animated: true,
                    style: { stroke: '#667eea' },
                    markerEnd: {
                        type: MarkerType.ArrowClosed,
                        color: '#667eea',
                    },
                });
            });

            yOffset++;
        });

        // 2. Handle Orphans (Peripherals with no connected computer in session, or Computers with no peripherals)
        // We already handled connected peripherals above. Now we need to find items not yet added to nodes.
        const addedNodeIds = new Set(nodes.map(n => n.id));

        const orphans = sessionItems.filter(item => !addedNodeIds.has(item.barcode_id));

        orphans.forEach((item, k) => {
            nodes.push({
                id: item.barcode_id,
                data: { label: `${item.equipment_type || 'Item'}: ${item.brand} ${item.model} (${item.barcode_id})` },
                position: { x: 600, y: k * 150 + 50 }, // Position orphans to the right
                style: { background: '#fff', border: '1px solid #ccc', borderRadius: '8px', padding: '10px', width: 180 }
            });
        });

        return { initialNodes: nodes, initialEdges: edges };
    }, [sessionItems]);

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    // Update graph when session items change
    useEffect(() => {
        setNodes(initialNodes);
        setEdges(initialEdges);
    }, [initialNodes, initialEdges, setNodes, setEdges]);

    if (sessionCodes.length === 0) {
        return null; // Don't show graph if no codes
    }

    return (
        <div className="peripheral-graph-container" style={{ height: '400px', marginTop: '1rem' }}>
            <div className="graph-header">
                <h3>🕸️ Visualisation</h3>
            </div>
            <div style={{ height: '100%', border: '1px solid #eee', borderRadius: '12px', overflow: 'hidden' }}>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    fitView
                    attributionPosition="bottom-right"
                >
                    <Background color="#aaa" gap={16} />
                    <Controls />
                </ReactFlow>
            </div>
        </div>
    );
};

export default PeripheralGraph;
