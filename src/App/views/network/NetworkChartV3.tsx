import React, { useEffect, useRef, useMemo } from 'react';
import fcose from 'cytoscape-fcose';
import cola from 'cytoscape-cola';
// import cxtmenu from 'cytoscape-cxtmenu';
import cytoscape, { AbstractEventObject, EdgeSingular, NodeSingular } from 'cytoscape';
import { useAppDispatch, useAppSelector } from '../../../redux/hooks';
import { scaleOrdinal, scaleQuantile } from '@visx/scale';
import * as d3 from 'd3';
import { resetFocusedElement, setFocusedElement } from '../../../redux/analysisSlice';
import "./styles.css";

cytoscape.use(cola);
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
        const proportions = displayedLinks.filter(link => link.__typename === 'FileVersionLink').map((link: any) => link.byteProportion)
        return scaleQuantile({
            domain: [Math.min(...proportions), Math.max(...proportions)],
            range: ['#9096f8', '#78f6ef', '#6ce18b', '#f19938', '#eb4d70']
        });
    }, [displayedLinks]);

    const networkActivityColorScale = useMemo(() => {
        const proportions = displayedLinks.filter(link => link.__typename === 'NetworkActivityLink').map((link: any) => link.byteProportion)
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
                    label: node.name.split('/')[node.name.split('/').length - 1],
                    parent: node.hostName,
                    hostName: node.hostName,
                    __typename: 'Process'}
                });
            if (node.__typename === 'File') tmpNodes.push( { 
                data: {
                    id: node.id,
                    label: node.type,
                    parent: node.hostName,
                    hostName: node.hostName,
                    path: node.path,
                    type: node.type,
                    __typename: 'File'} 
                });
            if (node.__typename === 'Port') tmpNodes.push( { data: {id: node.id, label: node.portNumber, parent: node.hostName, hostName: node.hostName, __typename: 'Port'}})
        });
        return tmpNodes
    }, [displayedNodes, groupingEnabled]);

    const links = useMemo(() => {
        const tmpLinks: { data: any }[]= []
        displayedLinks.forEach((link: any) => {
            if (link.__typename === 'FileVersionLink') tmpLinks.push( { data: {id: link.id, source: link.source, target: link.target, byteProportion: link.byteProportion, __typename: 'FileVersionLink'}});
            if (link.__typename === 'NetworkActivityLink') tmpLinks.push( { data: {id: link.id, source: link.source, target: link.target, byteProportion: link.byteProportion, __typename: 'NetworkActivityLink'}});
            if (link.__typename === 'PortLink') tmpLinks.push( { data: {id: link.id, source: link.source, target: link.target, __typename: 'PortLink'} } );
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
                .edges('[__typename = "NetworkActivityLink"]')
                .style('line-color', (ele: EdgeSingular) => networkActivityColorScale(ele.data().byteProportion))
                .style('target-arrow-color', (ele: EdgeSingular) => networkActivityColorScale(ele.data().byteProportion));

            graph.current
                .edges('[__typename = "FileVersionLink"]')
                .style('line-color', (ele: EdgeSingular) => fileVersionColorScale(ele.data().byteProportion))
                .style('target-arrow-color', (ele: EdgeSingular) => fileVersionColorScale(ele.data().byteProportion));

            graph.current
                .edges('.hover')
                .style('line-color', '#bebebe')

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
            graph.current.elements().removeClass('selected unselected');
        }
    }, [focusedElement.id])

    useEffect(() => {
        if (graph.current){
            graph.current.on('tap', 'edge', (e: AbstractEventObject) => {        
                if (e.target.hasClass("selected") && e.target.data().id === focusedElement.id) {
                    graph.current.elements().toggleClass('selected unselected', false);
                    dispatch(resetFocusedElement());
                } else {
                    dispatch(setFocusedElement(displayedLinks.find((link: any) => link.id === e.target.data().id)));
                    graph.current.elements().toggleClass('unselected', true);
                    e.target.toggleClass('unselected', false).toggleClass("selected", true);
                    e.target.targets().toggleClass('unselected', false).toggleClass("selected", true);
                    e.target.sources().toggleClass('unselected', false).toggleClass("selected", true);
                }
            });

            graph.current.on('tap', 'node', (e: AbstractEventObject) => {
                if (e.target.hasClass("selected") && e.target.data().id === focusedElement.id) {
                    graph.current.elements().toggleClass('selected unselected', false);
                    dispatch(resetFocusedElement());
                } else {
                    dispatch(setFocusedElement(displayedNodes.find((node: any) => node.id === e.target.data().id)));
                    graph.current.elements().toggleClass('unselected', true);
                    e.target.toggleClass('unselected', false).toggleClass("selected", true);
                    e.target.connectedEdges().toggleClass('unselected', false).toggleClass("selected", true);
                    e.target.connectedEdges().targets().toggleClass('unselected', false).toggleClass("selected", true);
                    e.target.connectedEdges().sources().toggleClass('unselected', false).toggleClass("selected", true);
                }
            });
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
                        name: "fcose",
                    },
        
                    style:      
                    [
                        {
                            selector: 'node',
                            style: {
                                "border-width": 4,
                                "border-color": '#fff',
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
                            selector: '$node > node',
                            style: {
                                "background-color": '#fff',
                                "background-opacity": 1,
                                "border-color": (ele: NodeSingular) => hostColorScale(ele.data().id),
                            }
                        },
                        {
                            selector: 'node.hover',
                            style: {
                               "border-color": (ele: NodeSingular) => hostColorScale(ele.data().hostName),
                            }
                        },
                        //TODO: Die "Endpoint"-Knoten liegen beim Select anscheinend vor den anderen. 
                        // Sieht man, da sich die border-color der normalen Knoten eindeutig verändert,
                        // sie aber trotzdem irgendwie überlagert sind
                        {
                            selector: 'node.selected',
                            style: {
                                "border-color": (ele: NodeSingular) => hostColorScale(ele.data().hostName),
                            },
                        },
                        {
                            selector: 'node.unselected',
                            style: {
                                opacity: 0.2,
                            }
                        },
        
                        {
                            selector: 'edge',
                            style: {
                                width: 1,
                                'line-color': '#909090',
                                'curve-style': 'bezier',
                                'control-point-step-size': 40, 
                                'target-arrow-color': '#909090',
                            }
                        },
                        {
                            selector: 'edge[__typename = "PortLink"]',
                            style: {
                                'curve-style': 'bezier',
                                'source-arrow-shape': 'circle',
                            }
                        },
                        {
                            selector: 'edge[__typename = "NetworkActivityLink"]',
                            style: {
                                'curve-style': 'bezier',
                                'target-arrow-shape': 'triangle',
                                // 'label': (ele: EdgeSingular) => `${(ele.data().byteProportion * 100).toFixed(2)}%`,
                            }
                        },
                        {
                            selector: 'edge[__typename = "FileVersionLink"]',
                            style: {
                                'curve-style': 'bezier',
                                'target-arrow-shape': 'triangle-tee',
                                'line-style': 'dashed',
                                'line-dash-pattern': [6, 3],
                            }
                        },
                        {
                            selector: 'edge.hover',
                            style: {
                                width: 4,
                            }
                        },
                        {
                            selector: 'edge.selected',
                            style: {
                                width: 4,
                            },
                        },
                        {
                            selector: 'edge.unselected',
                            style: {
                                opacity: 0.2,
                            }
                        }
                    ],
        
                    elements: [...nodes, ...links]
                });
            }

            graph.current.on('mouseover', 'node', (e: any) => e.target.addClass('hover'));
            graph.current.on('mouseout', 'node', (e: any) => e.target.removeClass('hover'));

            graph.current.on('mouseover', 'edge', (e: any) => e.target.addClass('hover'));
            graph.current.on('mouseout', 'edge', (e: any) => e.target.removeClass('hover'));

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
       <div id="cy" className="graph" ref={container} style={{ height: '100%' }}/>
    )
}

export default NetworkChartV3;