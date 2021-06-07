import React, { useEffect, useRef, useMemo } from 'react';
import fcose from 'cytoscape-fcose';
// import cola from 'cytoscape-cola';
// import cxtmenu from 'cytoscape-cxtmenu';
import cytoscape, { AbstractEventObject, EdgeSingular, NodeSingular } from 'cytoscape';
import { useAppDispatch, useAppSelector } from '../../../redux/hooks';
import { scaleOrdinal, scaleQuantile } from '@visx/scale';
import * as d3 from 'd3';
import { resetFocusedElement, setFocusedElement } from '../../../redux/analysisSlice';

cytoscape.use(fcose);
// cytoscape.use( cxtmenu );

const NetworkChartV3: React.FunctionComponent = () => {
    const dispatch = useAppDispatch();
    const {
        groupingEnabled,
        displayedNodes,
        displayedLinks,
        activeHosts,
        focusedElement
    } = useAppSelector( state => state.analysisSliceReducer );

    const container = useRef<HTMLDivElement>(null);
    const graph = useRef<cytoscape.Core>();
    const layout = useRef<cytoscape.Layouts>();

    const hostColorScale = useMemo(() => 
    scaleOrdinal({
        range: [...d3.schemeTableau10],
        domain: activeHosts}), [activeHosts]);

    const fileVersionColorScale = useMemo(() => {
        const proportions = displayedLinks.filter(link => link.__typename === 'FileVersion').map((link: any) => link.byteProportion)
        return scaleQuantile({
            domain: [Math.min(...proportions), Math.max(...proportions)],
            range: ['#9096f8', '#78f6ef', '#6ce18b', '#f19938', '#eb4d70']
        });
    }, [displayedLinks]);

    const networkActivityColorScale = useMemo(() => {
        const proportions = displayedLinks.filter(link => link.__typename === 'NetworkActivity').map((link: any) => link.byteProportion)
        return scaleQuantile({
            domain: [Math.min(...proportions), Math.max(...proportions)],
            range: ['#9096f8', '#78f6ef', '#6ce18b', '#f19938', '#eb4d70']
        });
    }, [displayedLinks]);

    const nodes = useMemo(() => {
        const tmpNodes: { data: any }[] = [];
        displayedNodes.forEach((node: any) => {
            if(groupingEnabled) {
                if (node.__typename === 'EndPoint') tmpNodes.push( 
                    { data: {
                        id: node.id,
                        label: node.hostName,
                        ip: node.hostIp,
                        hostName: node.hostName,
                        __typename: 'Endpoint'} 
                    });
            }
            if (node.__typename === 'Process') tmpNodes.push( { 
                data: {
                    id: node.id,
                    label: node.name,
                    parent: node.hostName,
                    hostName: node.hostName,
                    __typename: 'Process'}
                });
            if (node.__typename === 'File') tmpNodes.push( { data: {id: node.id, label: node.type, parent: node.hostName, hostName: node.hostName, path: node.path, type: node.type, __typename: 'File'} });
            if (node.__typename === 'Port') tmpNodes.push( { data: {id: node.id, label: node.portNumber, parent: node.hostName, hostName: node.hostName, __typename: 'Port'}})
        });
        return tmpNodes
    }, [displayedNodes, groupingEnabled]);

    const links = useMemo(() => {
        const tmpLinks: { data: any }[]= []
        displayedLinks.forEach((link: any) => {
            if (link.__typename === 'FileVersion') tmpLinks.push( { data: {id: link.id, source: link.source, target: link.target, byteProportion: link.byteProportion, __typename: 'FileVersion'}});
            if (link.__typename === 'NetworkActivity') tmpLinks.push( { data: {id: link.id, source: link.source, target: link.target, byteProportion: link.byteProportion, __typename: 'NetworkActivity'}});
        });
        return tmpLinks;
    }, [displayedLinks]);

    useEffect(() => {
        if (graph.current) {
            const elements: cytoscape.ElementDefinition[] = [...nodes, ...links];

            if(layout.current) {
                layout.current.stop();
            }

            const displayedIds = elements.map((element: any) => element.id);
            const removeNodes = graph.current.nodes().filter((node: NodeSingular) => !displayedIds.includes(node.data().id))
            graph.current.remove(removeNodes);
            graph.current.add(elements.filter((element: any) => !graph.current.hasElementWithId(element.id)));
            
            graph.current
                .edges('[__typename = "NetworkActivity"]')
                .style('line-color', (ele: EdgeSingular) => networkActivityColorScale(ele.data().byteProportion))
                .style('target-arrow-color', (ele: EdgeSingular) => networkActivityColorScale(ele.data().byteProportion));

            graph.current
                .edges('[__typename = "FileVersion"]')
                .style('line-color', (ele: EdgeSingular) => fileVersionColorScale(ele.data().byteProportion))
                .style('target-arrow-color', (ele: EdgeSingular) => fileVersionColorScale(ele.data().byteProportion))
                .style('line-style', 'dashed')
                .style('line-dash-pattern', [6, 3]);

            layout.current = graph.current.elements().makeLayout({
                name: 'fcose',
            });
            layout.current.run();
        }
    }, [nodes, links, networkActivityColorScale, fileVersionColorScale]);

    useEffect(() => {
        if(!groupingEnabled) {
            graph.current
                .nodes()
                .style('background-color', (ele: NodeSingular) => hostColorScale(ele.data().hostName))
        }
    }, [groupingEnabled, hostColorScale]);

    useEffect(() => {
        if(!graph.current) return;

        if(focusedElement.id === '-1') {
            graph.current.edges().style('opacity', 1);
            graph.current.nodes('node[parent]').style('opacity', 1)
        }
    }, [focusedElement.id])

    useEffect(() => {
        if (graph.current){
            const focusEle = (type: string, event: AbstractEventObject) => {
                const selectedEleId = event.target._private.data.id;

                if (focusedElement.id === selectedEleId) {
                    graph.current.edges().style('opacity', 1);
                    graph.current.nodes('node[parent]').style('opacity', 1)
        
                    dispatch(resetFocusedElement());
                } else {
                    const focusedEle = graph.current.elements(`${type}[id="${selectedEleId}"]`)[0];
                    
                    graph.current.edges().style('opacity', 0.2);
                    graph.current.nodes('node[parent]').style('opacity', 0.2);
        
                    switch (type) {
                        case 'edge':
                            focusedEle.style('opacity', '1');
                            focusedEle.targets().style('opacity', 1);
                            focusedEle.sources().style('opacity', 1);
                            dispatch(setFocusedElement(displayedLinks.filter((node: any) => node.id === selectedEleId)[0]));
                            break;
                        case 'node':
                            focusedEle.style('opacity', '1');
                            const connectedEdges = focusedEle.connectedEdges();
                            connectedEdges.style('opacity', 1);
                            connectedEdges.targets().style('opacity', 1);
                            connectedEdges.sources().style('opacity', 1);
                            dispatch(setFocusedElement(displayedNodes.filter((link: any) => link.id === selectedEleId)[0]));
                            break;
                    }            
                }
            }

            graph.current.on('tap', 'node', (event: AbstractEventObject) => focusEle('node', event));
            graph.current.on('tap', 'edge', (event: AbstractEventObject) => focusEle('edge', event));
        }
    }, [dispatch, displayedLinks, displayedNodes, focusedElement])

    useEffect(() => {
        if (!container.current) {
            return;
        }
        try {
            if (!graph.current) {
                
                graph.current = cytoscape({
                    container: container.current,

                    autounselectify: true,
                    
                    boxSelectionEnabled: true,
        
                    layout: {
                        name: 'fcose',    
                    },
        
                    style:             
                    [
                        {
                            selector: 'node',
                            style: {
                                'transition-property': 'background-color border-color',
                            }
                        },
                        {
                            selector: 'node[label]',
                            style: {
                                'label': 'data(label)',
                                'background-color': (ele: NodeSingular) => hostColorScale(ele.data().hostName),
                                'text-outline-color': (ele: NodeSingular) => hostColorScale(ele.data().hostName),
                                'color': (ele: NodeSingular) => ele.data().__typename === 'Endpoint' ? hostColorScale(ele.data().hostName) : '#fff',
                                'text-outline-width': (ele: NodeSingular) => ele.data().__typename === 'Endpoint' ? 0 : 1,
                                'text-valign': (ele: NodeSingular) => ele.data().__typename === 'Endpoint' ? 'top' : 'center',
                                'text-halign': 'center',
                                'font-size': 10,
                            }
                        },
                        {
                            selector: 'node[__typename = "Process"]',
                            style: {
                                'shape': 'ellipse'
                            }
                        },
                        {
                            selector: 'node[__typename = "File"]',
                            style: {
                                'shape': 'round-triangle'
                            }
                        },
                        {
                            selector: 'node[__typename = "Port"]',
                            style: {
                                'shape': 'round-diamond'
                            }
                        },
                        {
                            selector: 'node[__typename = "Endpoint"]',
                            style: {
                                'background-color': (ele: NodeSingular) => hostColorScale(ele.data().id),
                                'background-opacity': 0.3,
                                'border-color': (ele: NodeSingular) => hostColorScale(ele.data().id)
                            }
                        },

        
                        {
                            selector: 'edge',
                            style: {
                                'line-color': '#909090',
                                'curve-style': 'bezier',
                                'control-point-step-size': 40, 
                                'target-arrow-color': '#909090',
                            }
                        },
                        {
                            selector: 'edge[__typename = "NetworkActivity"]',
                            style: {
                                'curve-style': 'bezier',
                                'target-arrow-shape': 'triangle',
                                // 'label': (ele: EdgeSingular) => `${(ele.data().byteProportion * 100).toFixed(2)}%`,
                            }
                        },
                        {
                            selector: 'edge[__typename = "FileVersion"]',
                            style: {
                                'curve-style': 'bezier',
                                'target-arrow-shape': 'triangle-tee',
                            }
                        }
                    ],
        
                    elements: [...nodes, ...links]
                });
            }

            /* (graph.current as any).cxtmenu({
                selector: 'node',

                commands: [
                    {
                        content: 'Focus',
                        select: function(ele){
                            console.log( ele.position() );
                        }
                    }
                ]
            }) */
        } catch (error) {
            console.error(error);
        }
        return () => {
            // graph.current && graph.current.destroy();
        }
    }, [])

    return(
       <div className="graph" ref={container} style={{ height: '100%'}}/>
    )
}

export default NetworkChartV3;