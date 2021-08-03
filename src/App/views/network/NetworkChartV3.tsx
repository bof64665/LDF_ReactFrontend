import React, { useEffect, useRef, useMemo } from 'react';
import fcose from 'cytoscape-fcose';
import cola from 'cytoscape-cola';
import d3Force from 'cytoscape-d3-force';
import cytoscape, { AbstractEventObject, EdgeSingular, NodeSingular } from 'cytoscape';
import { useAppDispatch, useAppSelector } from '../../../redux/hooks';
import { resetFocusedElement, setFocusedElement } from '../../../redux/analysisSlice';
import "./styles.css";
import { scaleOrdinal, scaleQuantile } from '@visx/scale';
import { schemeTableau10 } from 'd3';

cytoscape.use(cola);
cytoscape.use(fcose);
cytoscape.use(d3Force);

function getLinkQuantileColorScale(linkData: any[]) {
    const proportions = linkData.map((link: any) => link.byteProportion);
    return scaleQuantile({
        domain: [Math.min(...proportions), Math.max(...proportions)],
        range: ['#9096f8', '#78f6ef', '#6ce18b', '#f19938', '#eb4d70']
    });
}
  
const NetworkChartV3: React.FunctionComponent = () => {
    const dispatch = useAppDispatch();
    const {
        groupingEnabled,
        displayedNodes,
        displayedLinks,
        focusedElement,
        fileVersionLinkData,
        networkActivityLinkData,
        activeHosts,
        hoveredEndpoint,
        hoveredFile,
    } = useAppSelector( state => state.analysisSliceReducer );

    const container = useRef<HTMLDivElement>(null);
    const graph = useRef<any>();
    const layout = useRef<any>();

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

    const d3ForceLayout = useMemo(() => {
        return {
            name: 'd3-force',
            animate: true,
            fixedAfterDragging: false,
            linkId: function id(d) {
            return d.id;
            },
            linkDistance: 80,
            manyBodyStrength: -300,
            ready: function(){},
            stop: function(){},
            tick: function(progress) {
                //console.log('progress - ', progress);
            },
            randomize: false,
            infinite: true
        }
    }, []);
    const colaLayout = useMemo(() => {
        return {
            name: 'cola',
            maxSimulationTime: 10000,

        };
    }, []);

    const fileVersionColorScale = useMemo(() => getLinkQuantileColorScale(fileVersionLinkData), [fileVersionLinkData]);
    const networkActivityColorScale = useMemo(() => getLinkQuantileColorScale(networkActivityLinkData), [networkActivityLinkData]);
    const hostColorScale = useMemo(() => scaleOrdinal({range: [...schemeTableau10], domain: activeHosts}), [activeHosts]);

    const removedElements = useRef<cytoscape.Collection>(null);
    const groupingStatus = useRef<boolean>(groupingEnabled);

    useEffect(() => {
        if(!graph.current) return;

        if(layout.current) layout.current.stop();

        const elementIdsToDisplay = [...links, ...nodes].map((test: any) => test.data.id);

        if(groupingStatus.current !== groupingEnabled) {
            removedElements.current = null;
            graph.current.elements().remove();
            graph.current.add(nodes.filter((node: any) => !graph.current.hasElementWithId(node.id)));
            graph.current.add(links.filter((link: any) => !graph.current.hasElementWithId(link.id)));
            groupingStatus.current = groupingEnabled;
        } else {
            if(graph.current.elements().length === 0) {
                if(removedElements.current && removedElements.current.length > 0) {
                    removedElements.current.restore();
                } else {
                    graph.current.add(nodes.filter((node: any) => !graph.current.hasElementWithId(node.id)));
                    graph.current.add(links.filter((link: any) => !graph.current.hasElementWithId(link.id)));
                }
            }
    
            if(removedElements.current && removedElements.current.length > 0) {
                elementIdsToDisplay.forEach((id: string) => {
                    removedElements.current.nodes().getElementById(id).restore();
                });
                elementIdsToDisplay.forEach((id: string) => {
                    removedElements.current.edges().getElementById(id).restore();
                });
                removedElements.current =  removedElements.current.union(graph.current.elements().filter((ele: cytoscape.EdgeSingular) => !elementIdsToDisplay.includes(ele.data().id)).remove());
            } else {
                removedElements.current =  graph.current.elements().filter((ele: cytoscape.EdgeSingular) => !elementIdsToDisplay.includes(ele.data().id)).remove();
            }
        }

        layout.current = graph.current.elements().makeLayout(d3ForceLayout);
        layout.current.run();
    }, [nodes, links, d3ForceLayout, colaLayout, groupingEnabled]);

    useEffect(() => {

        const getColor = (ele: NodeSingular): string => {
            if (ele.data().__typename === 'Endpoint') { return '#fff'; }
            if(ele.data().hostName !== '10.0.0.12') { return hostColorScale(ele.data().hostName) } 
            return '#858585';
        }

        if (!graph.current) return;

        graph.current.style()
            .selector('node[label]')
                .style('background-color', (ele: NodeSingular) => getColor(ele))
                .style('text-outline-color', (ele: NodeSingular) => getColor(ele))
                .style('color', (ele: NodeSingular) => ele.data().__typename === 'Endpoint' ? hostColorScale(ele.data().hostName) : '#fff')

            .selector('$node > node')
                .style("border-color", (ele: NodeSingular) => ele.data().hostName !== '10.0.0.12' ? hostColorScale(ele.data().hostName) : '#858585')
            
            .selector('node.hover')
                .style("border-color", (ele: NodeSingular) => ele.data().hostName !== '10.0.0.12' ? hostColorScale(ele.data().hostName) : '#858585')

            .selector('node.selected')
                .style("border-color", (ele: NodeSingular) => ele.data().hostName !== '10.0.0.12' ? hostColorScale(ele.data().hostName) : '#858585')

            .selector('edge[__typename = "NetworkActivityLink"]')
                .style('line-color', (ele: EdgeSingular) => networkActivityColorScale(ele.data().byteProportion))
                .style('target-arrow-color', (ele: EdgeSingular) => networkActivityColorScale(ele.data().byteProportion))

            .selector('edge[__typename = "FileVersionLink"]')
                .style('line-color', (ele: EdgeSingular) => fileVersionColorScale(ele.data().byteProportion))
                .style('target-arrow-color', (ele: EdgeSingular) => fileVersionColorScale(ele.data().byteProportion))

            .update();
    }, [fileVersionColorScale, hostColorScale, networkActivityColorScale])

    useEffect(() => {
        if(!groupingEnabled) {
            graph.current
                .nodes()
                .style('background-color', (ele: NodeSingular) => ele.data().hostName !== '10.0.0.12' ? hostColorScale(ele.data().hostName) : '#858585')
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
                if(e.target.data().__typename === 'PortLink') return;
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
    }, [dispatch, displayedLinks, displayedNodes, focusedElement]);

    useEffect(() => {
        if (!graph.current) return;

        if(hoveredEndpoint) {
            graph.current.nodes().filter(`[hostName = "${hoveredEndpoint}"]`).addClass('selected');
            graph.current.nodes().filter(`[hostName != "${hoveredEndpoint}"]`).addClass('unselected');
            graph.current.edges().addClass('unselected');
        } else {
            graph.current.elements().removeClass('selected unselected');
        }
        
    }, [hoveredEndpoint]);

    useEffect(() => {
        if (!graph.current) return;

        if(hoveredFile) {
            graph.current.nodes().$id(hoveredFile).addClass('selected');
            graph.current.nodes().filter(`[id != "${hoveredFile}"]`).addClass('unselected');
            graph.current.edges().addClass('unselected');
        } else {
            graph.current.elements().removeClass('selected unselected');
        }
        
    }, [hoveredFile]);

    useEffect(() => {
        if (!container.current) {
            return;
        }
        try {
            if (!graph.current) {
                
                graph.current = cytoscape({
                    layout: d3ForceLayout,
                    container: container.current,
                    autounselectify: true,                   
                    boxSelectionEnabled: true,
                    wheelSensitivity: 0.1,
                    style:      
                    [
                        {
                            selector: 'node',
                            style: {
                                "border-width": 2.5,
                                "border-color": '#fff',
                            }
                        },
                        {
                            selector: 'node[label]',
                            style: {
                                'label': 'data(label)',
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
                            }
                        },
                        {
                            selector: 'node.unselected',
                            style: {
                               opacity: 0.2
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
                });
            }

            graph.current.on('mouseover', 'node', (e: any) => e.target.addClass('hover'));
            graph.current.on('mouseout', 'node', (e: any) => e.target.removeClass('hover'));

            graph.current.on('mouseover', 'edge', (e: any) => e.target.addClass('hover'));
            graph.current.on('mouseout', 'edge', (e: any) => e.target.removeClass('hover'));

        } catch (error) {
            console.error(error);
        }
        return () => {
            // graph.current && graph.current.destroy();
        }
    }, [d3ForceLayout])

    return(
       <div id="cy" className="graph" ref={container} style={{ height: '100%' }}/>
    )
}

export default NetworkChartV3;