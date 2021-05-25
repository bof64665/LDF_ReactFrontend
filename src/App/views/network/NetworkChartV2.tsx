import { cloneDeep } from "lodash";
import forceInABox from './forceInABox';
import { useCallback, useMemo, useEffect, useRef } from "react";
import * as d3 from 'd3';
import { scaleOrdinal, scaleQuantile } from '@visx/scale';
import { useAppDispatch, useAppSelector } from "../../../redux/hooks";
import { resetHoveredElement, setFocusedElement, setHoveredElement } from "../../../redux/analysisSlice";


declare global {
    interface Window {
        forceInABox: () => any; 
    }
}

const settings = {
    nodeRadius: 17,
    nodeStrokeWidth: 2,
    hoverFactor: 0.25,
};
const triangleHeight = Math.sqrt(3) * settings.nodeRadius;

const NetworkChart = ({
    width,
    height,
}: {
    width: number,
    height: number,
}) => {
    const dispatch = useAppDispatch();
    const {
        groupingEnabled,
        displayedNodes,
        displayedLinks,
        activeHosts,
        networkActivityLinkData,
        fileVersionLinkData,
        focusedElement,
    } = useAppSelector( state => state.analysisSliceReducer );

    const svgRef = useRef(null);
    const simulation = useRef(null);
    let dragging = useRef(false);

    const nodes = useMemo(() => cloneDeep(displayedNodes), [displayedNodes]);
    const links = useMemo(() => cloneDeep(displayedLinks), [displayedLinks]);

    const hostColorScale = useMemo(() => 
    scaleOrdinal({
        range: [...d3.schemeTableau10],
        domain: activeHosts}), [activeHosts]);

    const fileVersionColorScale = useMemo(() => {
        const proportions = fileVersionLinkData.map((link: any) => link.byteProportion)
        return scaleQuantile({
            domain: [Math.min(...proportions), Math.max(...proportions)],
            range: ['#9096f8', '#78f6ef', '#6ce18b', '#f19938', '#eb4d70']
        });
    }, [fileVersionLinkData]);

    const networkActivityColorScale = useMemo(() => {
        const proportions = networkActivityLinkData.map((link: any) => link.byteProportion)
        return scaleQuantile({
            domain: [Math.min(...proportions), Math.max(...proportions)],
            range: ['#9096f8', '#78f6ef', '#6ce18b', '#f19938', '#eb4d70']
        });
    }, [networkActivityLinkData]);

    const groupIds: string[] = useMemo(() => {
        if(!groupingEnabled) return [];

        const groupIdsMap = new Map();
        nodes.forEach((node: any) => {
            if(groupIdsMap.get(node.hostName)) {
                groupIdsMap.set(node.hostName, {hostName: node.hostName, count: groupIdsMap.get(node.hostName).count + 1})
            } else {
                groupIdsMap.set(node.hostName, {hostName: node.hostName, count: 1})
            }
        });
    
        return Array.from(groupIdsMap)
            .filter(element => element[1].count > 2)
            .map(element => element[1].hostName);
    }, [groupingEnabled, nodes]);

    const linkMouseOver = useCallback(
        (event: any, link: any) => {
            if(focusedElement) return;

            dispatch(setHoveredElement(cloneDeep(link)));

            d3.selectAll('.node')
                .transition().duration(500)
                .attr('opacity', (d: any) => d.id === link.target.id || d.id === link.source.id ? 1 : .2)
                .attr('stroke', (d: any) => d.id === link.target.id || d.id === link.source.id ? hostColorScale(d.hostName) : '#fff');

            d3.selectAll('.nodeLabel')
                .transition().duration(500)
                .attr('opacity', (d: any) => d.id === link.target.id || d.id === link.source.id ? 1 : .2);

            d3.selectAll('.link')
                .transition().duration(500)
                .attr('opacity', (d: any) => link.id === d.id ? 1 : .2);

            d3.selectAll('.marker')
                .transition().duration(500)
                .attr('opacity', (d: any) => link.id === d.id ? 1 : .2);
    
            d3.selectAll('.markerPath')
                .transition().duration(500)
                .attr('opacity', (d: any) => link.id === d.id ? 1 : .2);
        },
        [dispatch, focusedElement, hostColorScale]
    );

    const nodeMouseOver = useCallback(
        (event: any, node: any) => {
            if(focusedElement) return;

            dispatch(setHoveredElement(cloneDeep(node)));
            
            const neighborNodesIDs = links
                .filter((link: any) => link.source.id === node.id || link.target.id === node.id)
                .map((link: any) => link.source.id === node.id ? link.target.id : link.source.id);

            d3.selectAll('.node')
                .transition().duration(500)
                .attr('opacity', (d: any) => node.id === d.id || neighborNodesIDs.indexOf (d.id) > -1 ? 1 : .2)
                .attr('stroke', (d: any) => node.id === d.id || neighborNodesIDs.indexOf (d.id) > -1 ? hostColorScale(d.hostName) : '#fff');

            d3.selectAll('.nodeLabel')
                .transition().duration(500)
                .attr('opacity', (d: any) => node.id === d.id || neighborNodesIDs.indexOf (d.id) > -1 ? 1 : .2);
        
            d3.selectAll('.link')
                .transition().duration(500)
                .attr('opacity', (d: any) => (node.id === d.source.id || node.id === d.target.id) ? 1 : .2);

            d3.selectAll('.marker')
                .transition().duration(500)
                .attr('opacity', (d: any) => (node.id === d.source.id || node.id === d.target.id) ? 1 : .2);

            d3.selectAll('.markerPath')
                .transition().duration(500)
                .attr('opacity', (d: any) => (node.id === d.source.id || node.id === d.target.id) ? 1 : .2);
        },
        [focusedElement, dispatch, links, hostColorScale],
    );

    const mouseOut = useCallback(
        () => {
            if(focusedElement || dragging.current) return;

            dispatch(resetHoveredElement());

            d3.selectAll('.node')
                .transition().duration(250)
                .attr('opacity', 1)
                .attr('stroke', '#fff');

            d3.selectAll('.nodeLabel')
                .transition().duration(250)
                .attr('opacity', 1);

            d3.selectAll('.link')
                .transition().duration(250)
                .attr('opacity', 1);

            d3.selectAll('.marker')
                .transition().duration(250)
                .attr('opacity', 1);
    
            d3.selectAll('.markerPath')
                .transition().duration(250)
                .attr('opacity', 1);
        },
        [dispatch, focusedElement],
    );

    const elementClicked = useCallback(
        (event: any, element: any) => {
            
            // console.log(element);
            if(focusedElement) {
                console.log(element.id === focusedElement.id)
                if(element.id === focusedElement.id) {
                    // dispatch(resetHoveredElement());
                    dispatch(setFocusedElement(null));
                }
            }
            if(event.defaultPrevented) return;
            dispatch(setFocusedElement(cloneDeep(element)));
        },
        [dispatch, focusedElement],
    );

    const svg = useCallback(() => d3.selectAll('.network-graph')
        .attr('width', width)
        .attr('height', height > 15 ? height-15 : height)
        .attr('viewBox', `${-width / 2} ${-height / 2} ${width} ${height > 15 ? height-15: height}`)
    , [width, height]);

    const d3Groups = useMemo(() => {
        let selection = d3.select('.groups');
        if(selection.empty()) {
            selection = svg().append('g')
                .attr('class', 'groups')
        }
        return selection;
    }, [svg]);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const d3Marker: d3.Selection<d3.BaseType | SVGMarkerElement, any, d3.BaseType, unknown> = useMemo(() => {
        let selection = d3.select('.markers');
        if( selection.empty() ) {
            selection = svg().append('g')
                .attr('class', 'markers');
        }
        return selection.selectAll('.marker')
            .data(links)
            .join('marker')
            .attr('class', 'marker')
            .attr('id', (d: any) => `${d.id}_arrowhead`)
            .attr('viewBox','-0 -5 10 10')
            .attr('refX', 0)
            .attr('refY', 0)
            .attr('orient','auto')
            .attr('markerWidth',13)
            .attr('markerHeight',13)
            .attr('xoverflow','visible')
            .append('path')
            .attr('d', 'M 0 -3 L 6 0 L 0 3')
            .attr('fill', (d: any) => {
                switch (d.__typename) {
                    case 'FileVersion':
                        return fileVersionColorScale(d.byteProportion);
                    default:
                        return networkActivityColorScale(d.byteProportion);
                    }
                })
            .style('stroke','none');;
    }, [fileVersionColorScale, links, networkActivityColorScale, svg]);

    const d3LinkMarkerPaths: d3.Selection<d3.BaseType | SVGPathElement, any, d3.BaseType, unknown> = useMemo(() => {
        let selection = d3.select('.linkMarkerPaths')
        if(selection.empty()) {
            selection = svg().append('g')
                .attr('class', 'linkMarkerPaths')
        }
        return selection.selectAll('.markerPath')
            .data(links)
            .join('path')
            .attr('class', 'markerPath')
            .attr('fill', 'none')
            .attr('stroke-opacity', .5)
            .attr('stroke-width', 1.5)
            .attr('marker-mid', (d: any) => d.__typename === 'FileVersion' ? `url(#${d.id}_arrowhead)` : 'none')
            .attr('marker-end', (d: any) => d.__typename === 'NetworkActivity' ? `url(#${d.id}_arrowhead)` : 'none');
    }, [links, svg]);

    const d3Links: d3.Selection<d3.BaseType | SVGPathElement, any, d3.BaseType, unknown> = useMemo(() => {
        let selection = d3.select('.links');
        if( selection.empty() ) {
            selection = svg().append('g')
                .attr('class', 'links');
        }
        return selection.selectAll('.link')
            .data(links)
            .join('path')
            .attr('id', (d: any) => d.id)
            .attr('class', 'link')
            .attr('stroke', '#999')
            .attr('fill', 'none')
            .attr('stroke', (d: any) => {
                switch (d.__typename) {
                    case 'PortLink':
                        return '#999';
                    case 'FileVersion':
                        return fileVersionColorScale(d.byteProportion);
                    default:
                        return networkActivityColorScale(d.byteProportion);
                }
            })
            .attr('stroke-width', 3)
            .attr('stroke-dasharray', (d: any) => {
                switch (d.__typename) {
                    case 'PortLink':
                        return '2 1';
                    case 'NetworkActivity':
                        return '5 3';
                    default:
                        return 0;
                }
            })
            .on('mouseover', linkMouseOver)
            .on('mouseout', mouseOut)
            .on('click', elementClicked);
    }, [links, linkMouseOver, mouseOut, elementClicked, svg, fileVersionColorScale, networkActivityColorScale]);

    const d3Nodes: d3.Selection<d3.BaseType | SVGPathElement, any, d3.BaseType, unknown> = useMemo(() => {
        let selection = d3.select('.nodes');
        if( selection.empty() ) {
            selection = svg().append('g')
                .attr('class', 'nodes');
        } 
        return selection.selectAll('.node')
            .data(nodes)
            .join('path')
            .attr('class', 'node')
            .attr('id', (d: any) => d.id)
            .attr('stroke', '#fff')
            .attr('fill', (d: any) => hostColorScale(d.hostName))
            .on('mouseover', nodeMouseOver)
            .on('mouseout', mouseOut)
            .on('click', elementClicked)
            .call(d3.drag()
                .on('start', (event: any, node: any) => {
                    simulation.current.alphaTarget(0.1).restart();
                    dragging.current = true;
                    node.fx = node.x;
                    node.fy = node.y;
                })
                .on('drag', (event: any, node: any) => {
                    node.fx = event.x;
                    node.fy = event.y;
                })
                .on('end', (event: any, node: any) => {
                    simulation.current.alphaTarget(0.1).restart();
                    dragging.current = false;
                    node.fx = null;
                    node.fy = null;
                })
            );
    }, [hostColorScale, mouseOut, elementClicked, nodeMouseOver, nodes, svg]);

    const d3NodeLabels = useMemo(() => {
        let selection = d3.select('.nodeLabels')
        if (selection.empty()) {
            selection = svg().append('g')
                .attr('class', 'nodeLabels')
        }
        return selection.selectAll('.nodeLabel')
            .data(nodes)
            .join('text')
            .attr('x', settings.nodeRadius + 3)
            .attr('y', '0.29em')
            .attr('class', 'nodeLabel')
            .attr('font-size', '0.6em')
            .attr('cursor', 'default')
            .text((d: any) => {
                switch (d.__typename) {
                    case 'File':
                        return `.${d.type}`;
                    case 'EndPoint':
                        return d.hostIp;
                    case 'Port':
                        return `:${d.portNumber}`
                    case 'Process':
                        return d.name
                    default:
                        return d.id;
                }
            });
    }, [nodes, svg]);

    const d3GroupPaths = useMemo(() => {
        return d3Groups.selectAll('.groupPath')
            .data(groupIds, (d) => +d)
            .join('g')
            .attr('class', 'groupPath')
            .attr('id', (d) => d)
            .append('path')
            .attr('stroke', d => hostColorScale(d))
            .attr('stroke-opacity', 1)
            .attr('fill-opacity', 0.2)
            .attr('fill', d => hostColorScale(d))
            .attr('opacity', 1)
            .call(groupDragging(simulation.current, nodes));
    }, [d3Groups, groupIds, hostColorScale, nodes]);

    useEffect(() => {
        simulation.current = d3.forceSimulation()
            .nodes(nodes)
            .force("charge", d3.forceManyBody().strength(-527))
            .force("collide", d3.forceCollide(25))
            .force("link", d3.forceLink(links)
                .distance(50)
                .strength(0.1))
            .force('x', d3.forceX())
            .force('y', d3.forceY());


        simulation.current.on('tick', () => {
            updateNodes();
            updateNodeLabels();
            updateLinks();
            if(groupingEnabled) updateGroups();
        });

        const updateNodes = () => {
            d3Nodes.attr('d', (d: any) => {
                if(!d.x || !d.y) return 'M 0 0';
                switch (d.__typename) {
                    case 'File':
                        return `
                        M ${d.x} ${d.y - triangleHeight / 2 - 5}
                        L ${d.x - settings.nodeRadius} ${d.y + triangleHeight/ 2 - 5}
                        L ${d.x + settings.nodeRadius} ${d.y + triangleHeight / 2 - 5}
                        Z`;
                    case 'EndPoint':
                        return `
                        M ${d.x - settings.nodeRadius} ${d.y - settings.nodeRadius} 
                        L ${d.x + settings.nodeRadius} ${d.y - settings.nodeRadius} 
                        L ${d.x + settings.nodeRadius} ${d.y + settings.nodeRadius} 
                        L ${d.x - settings.nodeRadius} ${d.y + settings.nodeRadius} 
                        Z`;
                    case 'Port':
                        return `
                        M ${d.x - settings.nodeRadius} ${d.y} 
                        L ${d.x} ${d.y + settings.nodeRadius} 
                        L ${d.x + settings.nodeRadius} ${d.y} 
                        L ${d.x} ${d.y - settings.nodeRadius}
                        Z`;
                    case 'Process':
                        return `
                        M ${d.x - settings.nodeRadius} ${d.y}
                        A ${settings.nodeRadius / 2} ${settings.nodeRadius / 2} 0 1 0 ${d.x + settings.nodeRadius} ${d.y}
                        A ${settings.nodeRadius / 2} ${settings.nodeRadius / 2} 0 1 0 ${d.x - settings.nodeRadius} ${d.y} 
                        `;
                    default:
                        break;
                }
            });
        };
        const updateNodeLabels = () => {
            d3NodeLabels.attr('transform', (d: any) => (!d.x || !d.y) ? `translate(0, 0)` : `translate(${d.x}, ${d.y})`);
        }
        const updateLinks = () => {
            d3Links.attr('d', (d: any) => {
                if(!d.target.x || !d.target.y || !d.source.x || !d.source.y) return 'M 0 0';
                switch (d.__typename) {
                    case 'NetworkActivity':
                        const r = Math.hypot(d.target.x - d.source.x, d.target.y - d.source.y);
                        return `
                        M${d.source.x},${d.source.y}
                        A${r},${r} 0 0,1 ${d.target.x},${d.target.y}`;
                    case 'FileVersion':
                        return `
                        M ${d.source.x} ${d.source.y}
                        L ${d.target.x} ${d.target.y}`;
                    default:
                        return `
                        M ${d.source.x} ${d.source.y}
                        L ${d.target.x} ${d.target.y}`;
                }
            });

            d3LinkMarkerPaths.attr('d', (d: any) => {
                if(!d.source.x) return '';
                switch (d.__typename) {
                    case 'NetworkActivity':
                        const dx = d.target.x - d.source.x;
                        const dy = d.target.y - d.source.y;
                        const dr = Math.sqrt(dx * dx + dy * dy);
                        let endX = (d.target.x + d.source.x) / 2;
                        let endY = (d.target.y + d.source.y) / 2;
                        const len = dr - ((dr/2) * Math.sqrt(3));
                        endX = endX + (dy * len/dr);
                        endY = endY + (-dx * len/dr);               
                        return `M ${d.source.x} ${d.source.y} A ${dr} ${dr} 0 0 1 ${endX} ${endY}`;
                    case 'FileVersion':
                        return `M ${d.source.x} ${d.source.y} 
                        L ${(d.target.x + d.source.x) / 2} ${(d.target.y + d.source.y) / 2}
                        L ${d.target.x} ${d.target.y}`;
                    default:
                        break;
                }
            });
        }
        const updateGroups = () => {
            groupIds.forEach(function(groupId) {
                const scaleFactor: number = 1.4;
                let centroid: [number, number];
                var path = d3GroupPaths.filter(d => d === groupId)
                    .attr('transform', 'scale(1) translate(0,0)')
                    .attr('d', d => {
                        let polygon = polygonGenerator(d, nodes);    
                        centroid = d3.polygonCentroid(polygon);
                        const valueline = d3.line()
                            .x(function(d) { return d[0]; })
                            .y(function(d) { return d[1]; })
                            .curve(d3.curveLinearClosed)
                        return valueline(polygon.map(point => [  point[0] - centroid[0], point[1] - centroid[1] ]));
                    });
              d3.select(path.node().parentNode).attr('transform', 'translate('  + centroid[0] + ',' + (centroid[1]) + ') scale(' + scaleFactor + ')');
            });
        }
    }, []);

    useEffect(() => {
        let groupingForce: any = forceInABox();
        if(groupingEnabled) {
            simulation.current.force("group", groupingForce
                .template('force') // Either treemap or force
                .groupBy("hostName") // Nodes' attribute to group
                .strength(0.2) // Strength to foci
                .links(links) // The graph links. Must be called after setting the grouping attribute (Force template only)
                .enableGrouping(true)
                .linkStrengthInterCluster(0.01) // linkStrength between nodes of different clusters
                .linkStrengthIntraCluster(0.11) // linkStrength between nodes of the same cluster
                .forceLinkDistance(5000) // linkDistance between meta-nodes on the template (Force template only)
                .forceLinkStrength(0.035) // linkStrength between meta-nodes of the template (Force template only)
                .forceCharge(-527) // Charge between the meta-nodes (Force template only)
                .forceNodeSize(25) // Used to compute the template force nodes size (Force template only)
            )
        } else {
            simulation.current
                .force('x', d3.forceX())
                .force('y', d3.forceY())
        }
    }, [links, groupingEnabled])

    return <svg ref={svgRef} className='network-graph' width={width} height={height}/>;
}

function polygonGenerator(groupId: string, nodes: any) {
    const nodeCoords = nodes
        .filter((d: any) => d.hostName === groupId)
        .map((d: any) => [d.x, d.y] as [number, number]);

    return d3.polygonHull(nodeCoords);
}

function groupDragging (simulation: any, nodes: any) {
    function start(event: any, group: any) {
        if(!event.active) simulation.alphaTarget(0.3).restart();
        d3.select(this).style('stroke-width', 3);
    }

    function drag(event: any, groupId: any) {
        nodes
          .filter((d: any) => d.hostName === groupId)
          .forEach((d: any) => {
            d.x += event.dx;
            d.y += event.dy;
          });
      }

    function end(event: any, node: any) {
        simulation.alphaTarget(0.3).restart();
        d3.select(this).style('stroke-width', 1);
    }

    return d3.drag()
        .on('start', start)
        .on('drag', drag)
        .on('end', end);
}

export default NetworkChart;