import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { withTooltip} from '@visx/tooltip';
import { WithTooltipProvidedProps } from '@visx/tooltip/lib/enhancers/withTooltip';
import * as d3 from 'd3';
import { scaleLinear, scaleOrdinal } from '@visx/scale';
import { Legend, LegendItem, LegendLabel, LegendOrdinal } from '@visx/legend';
import forceInABox from './forceInABox';
import { Endpoint } from '../../models/Endpoint';
import React from 'react';
import { createStyles, makeStyles, Theme } from '@material-ui/core';
import clsx from 'clsx';

declare global {
    interface Window {
        forceInABox: () => any; 
    }
}

//custom styles
const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        legend: {
            position: 'absolute',
            top: 5,
            width: '10%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            fontSize: '10px',
            lineHeight: '0.9em',
            color: '#000',
            fontFamily: 'arial',
            padding: '10px 10px',
            float: 'left',
            border: '1px solid rgba(0, 0, 0, 0.3)',
            borderRadius: '5px',
            margin: '5px 5px'
        },
        legendTitle: {
            fontSize: '11px',
            marginBottom: '10px',
            fontWeight: 100,
        }
    }),
);

const connectionIntensityColorScale = scaleLinear({
    domain: [0, 1],
	range: ['#425fbd', '#d93b26'],
});

const settings = {
    nodeRadius: 17,
    legendNodeRadius: 6.5,
    nodeStrokeWidth: 1.5,
    hoverFactor: 0.25,
};
const triangleHeight = Math.sqrt(3) * settings.nodeRadius;
const legendTriangleHeight = Math.sqrt(3) * settings.legendNodeRadius;

const shapeScale = scaleOrdinal<string, React.FC | React.ReactNode>({
    domain: ['Process', 'Port', 'File', 'EndPoint'],
    range: [
      <path 
        d={`
            M 1 ${settings.legendNodeRadius + 1}
            a ${settings.legendNodeRadius / 2} ${settings.legendNodeRadius / 2} 0 1 0 ${settings.legendNodeRadius * 2 } 0
            a ${settings.legendNodeRadius} ${settings.legendNodeRadius} 0 1 0 ${-settings.legendNodeRadius * 2} 0
        `} fill="#dd59b8" />,
      <path d={`
            M 1 ${settings.legendNodeRadius} 
            L ${settings.legendNodeRadius} 1 
            L ${settings.legendNodeRadius * 2 - 1} ${settings.legendNodeRadius} 
            L ${settings.legendNodeRadius} ${settings.legendNodeRadius * 2 - 1 } Z
      `} fill="#dd59b8" />,
      <path d={`
            M 1 ${legendTriangleHeight}
            L ${settings.legendNodeRadius * 2 - 1} ${legendTriangleHeight}
            L ${settings.legendNodeRadius} 1 Z
      `} fill="#dd59b8" />,
      <path d={`
            M 1 1
            L 1 ${settings.legendNodeRadius * 2}
            L ${settings.legendNodeRadius * 2} ${settings.legendNodeRadius * 2}
            L ${settings.legendNodeRadius * 2} 0 Z
      `} fill="#dd59b8" />,
    ],
  });

type NetworkChartProps = {
    width: number;
    height: number;
    processesData: any;
    portsData: any;
    filesData: any;
    endpointsData: any;
    portLinksData: any;
    fileVersionLinksData: any;
    networkActivityLinksData: any;
}

export default withTooltip<NetworkChartProps, any>(
    ({
        width,
        height,
        processesData,
        portsData,
        filesData,
        endpointsData,
        portLinksData,
        fileVersionLinksData,
        networkActivityLinksData,
        showTooltip,
        hideTooltip}: NetworkChartProps & WithTooltipProvidedProps<any>) => {

    const classes = useStyles();

    const svgRef = useRef();

    const [hiddenHosts, setHiddenHosts] = useState([]);
    const [hiddenNodeTypes, setHiddenNodeTypes] = useState([]);
    const [displayedNodes, setDisplayedNodes] = useState([]);
    const [displayedLinks, setDisplayedLinks] = useState([]);

    const hosts = useMemo(() => {
        const types = ['localhost'];
        endpointsData.forEach((endpoint: Endpoint) => {
            if(types.indexOf(endpoint.hostName) < 0) types.push(endpoint.hostName); 
        });
        return types;
    }, [endpointsData]);

    const hostColorScale = useMemo(() => 
        scaleOrdinal({
            range: [...d3.schemeTableau10],
            domain: hosts}), [hosts]);

    const groupIds: string[] = useMemo(() => {
        const groupIdsMap = new Map();
       displayedNodes.forEach((node: any) => {
            if(groupIdsMap.get(node.hostName)) {
                groupIdsMap.set(node.hostName, {hostName: node.hostName, count: groupIdsMap.get(node.hostName).count + 1})
            } else {
                groupIdsMap.set(node.hostName, {hostName: node.hostName, count: 1})
            }
        });
    
        return Array.from(groupIdsMap)
            .filter(element => element[1].count > 2)
            .map(element => element[1].hostName);
    }, [displayedNodes]);



    let groupingForce: any = forceInABox();
    
    const forceSimulation = d3
        .forceSimulation()
        .nodes(displayedNodes)
        .force("group", groupingForce
            .template('force') // Either treemap or force
            .groupBy("hostName") // Nodes' attribute to group
            .strength(0.2) // Strength to foci
            .links([...portLinksData, ...fileVersionLinksData, ...networkActivityLinksData]) // The graph links. Must be called after setting the grouping attribute (Force template only)
            .enableGrouping(true)
            .linkStrengthInterCluster(0.01) // linkStrength between nodes of different clusters
            .linkStrengthIntraCluster(0.11) // linkStrength between nodes of the same cluster
            .forceLinkDistance(5000) // linkDistance between meta-nodes on the template (Force template only)
            .forceLinkStrength(0.035) // linkStrength between meta-nodes of the template (Force template only)
            .forceCharge(-527) // Charge between the meta-nodes (Force template only)
            .forceNodeSize(25) // Used to compute the template force nodes size (Force template only)
        )
        .force("charge", d3.forceManyBody().strength(-4))
        .force("collide", d3.forceCollide(settings.nodeRadius * 2))
        .force("link", 
            d3.forceLink(displayedLinks)
                .distance(5)
                .strength(groupingForce.getLinkStrength));

    const linkMouseOver = useCallback(
        (event: any, link: any) => {
        d3.selectAll('.node')
            .transition().duration(500)
            .attr('opacity', (d: any) => d.id === link.target.id || d.id === link.source.id ? 1 : .2)
            .attr('stroke', (d: any) => d.id === link.target.id || d.id === link.source.id ? hostColorScale(d.hostName) : '#fff');

        d3.selectAll('.link')
            .transition().duration(500)
            .attr('opacity', (d: any) => link.id === d.id ? 1 : .2);

        d3.selectAll('.node-text')
            .transition().duration(500)
            .attr('opacity', (d: any) => d.id === link.target.id || d.id === link.source.id ? 1 : .2);

        d3.selectAll('.marker')
            .transition().duration(500)
            .attr('opacity', (d: any) => link.id === d.id ? 1 : .2);
    }, [hostColorScale]);

    const nodeMouseOver = useCallback(
        (event: any, node: any) => {
            const neighborNodesIDs = displayedLinks
                .filter((link: any) => link.source.id === node.id || link.target.id === node.id)
                .map((link: any) => link.source.id === node.id ? link.target.id : link.source.id);

            d3.selectAll('.node')
                .transition().duration(500)
                .attr('opacity', (d: any) => node.id === d.id || neighborNodesIDs.indexOf (d.id) > -1 ? 1 : .2)
                .attr('stroke', (d: any) => node.id === d.id || neighborNodesIDs.indexOf (d.id) > -1 ? hostColorScale(d.hostName) : '#fff');
        
            d3.selectAll('.link')
                .transition().duration(500)
                .attr('opacity', (d: any) => (node.id === d.source.id || node.id === d.target.id) ? 1 : .2);

            d3.selectAll('.node-text')
                .transition().duration(500)
                .attr('opacity', (d: any) => node.id === d.id || neighborNodesIDs.indexOf (d.id) > -1 ? 1 : .2);

            d3.selectAll('.marker')
                .transition().duration(500)
                .attr('opacity', (d: any) => (node.id === d.source.id || node.id === d.target.id) ? 1 : .2);
        }, [displayedLinks, hostColorScale]);
    
    const mouseOut = () => {
        d3.selectAll('.node')
            .transition().duration(250)
            .attr('opacity', 1)
            .attr('stroke', '#fff');
    
        d3.selectAll('.link')
            .transition().duration(250)
            .attr('opacity', 1);

        d3.selectAll('.node-text')
            .transition().duration(250)
            .attr('opacity', 1);

        d3.selectAll('.marker')
            .transition().duration(250)
            .attr('opacity', 1);
    };
    
    const runForceGraph = useCallback(
        (container: any) => {
            const svg = d3.selectAll('.network-graph')
                .attr('width', width)
                .attr('height', height > 15 ? height-15 : height)
                .attr('viewBox', `${-width / 2} ${-height / 2} ${width} ${height > 15 ? height-15: height}`);

            svg.append('defs')
                .attr('class', 'markers')
                .selectAll('.marker')
                .data(displayedLinks)
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
                .attr('fill', (d: any) => getLinkColor(d))
                .style('stroke','none');
        
            const groups = svg.append('g').attr('class', 'groups');
            
            const links = svg.append('g')
                .attr('class', 'links')
                .selectAll('.link')
                .data(displayedLinks)
                .join('path')
                .attr('id', (d: any) => d.id)
                .attr('class', 'link')
                .attr('stroke', (d: any) => {
                    switch (d.__typename) {
                        case 'PortLink':
                            return '#999';
                        default:
                            return getLinkColor(d);
                    }
                })
                .attr('fill', 'none')
                .attr('stroke-width', 2)
                .attr('stroke-dasharray', (d: any) => {
                    switch (d.__typename) {
                        case 'PortLink':
                            return 2;
                        default:
                            return 0;
                    }
                })
                .on('mouseover', linkMouseOver)
                .on('mouseout', mouseOut);

            const linkMarkerPaths = svg.append('g')
                .attr('class', 'linkMarkerPaths')
                .selectAll('.markerPath')
                .data([...networkActivityLinksData, ...fileVersionLinksData])
                .join('path')
                .attr('class', 'markerPath')
                .attr('fill', 'none')
                .attr('stroke-opacity', .5)
                .attr('stroke-width', 1.5)
                .attr('marker-mid', (d: any) => d.__typename === 'FileVersion' ? `url(#${d.id}_arrowhead)` : 'none')
                .attr('marker-end', (d: any) => d.__typename === 'NetworkActivity' ? `url(#${d.id}_arrowhead)` : 'none');

            const nodes = svg.append('g')
                .attr('class', 'nodes')
                .selectAll('.node')
                .data(displayedNodes)
                .join('path')
                .attr('class', 'node')
                .attr('id', d => d.id)
                .attr('stroke', '#fff')
                .attr('stroke-width', settings.nodeStrokeWidth)
                .attr('fill', d => hostColorScale(d.hostName))
                .on('mouseover', nodeMouseOver)
                .on('mouseout', mouseOut)
                .call(nodeDragging(forceSimulation, settings));

            nodes.append('title')
                .text((d: any) => {
                    switch (d.__typename) {
                        case 'File':
                            return `${d.path}/${d.name}`;
                        case 'EndPoint':
                            return `${d.hostIp} (${d.hostName})`;
                        case 'Port':
                            return `:${d.portNumber}`
                        case 'Process':
                            return d.name
                        default:
                            return d.id;
                    }
                })
        
            const nodeLabels = svg.append('g')
                .attr('class', 'nodeText')
                .selectAll('g')
                .data(forceSimulation.nodes())
                .join('g');
        
            nodeLabels.append("text")
                .attr('x', -7)
                .attr('y', '0.29em')
                .attr('class', 'node-text')
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
                })
                .on('mouseover', nodeMouseOver)
                .on('mouseout', mouseOut)
                .call(nodeDragging(forceSimulation, settings));
        
            const paths = groups.selectAll('.path_placeholder')
                .data(groupIds, (d) => +d)
                .join('g')
                .attr('class', 'path_placeholder')
                .append('path')
                .attr('stroke', d => hostColorScale(d))
                .attr('stroke-opacity', 1)
                .attr('fill-opacity', 0.2)
                .attr('fill', d => hostColorScale(d))
                .attr('opacity', 1)
                .call(groupDragging(forceSimulation, displayedNodes));
        
            forceSimulation.on('tick', () => {   
                updateNodes();
                updateLinks();
                updateGroups();
        
                nodeLabels.attr('transform', (d: any) => `translate(${d.x},${d.y})`);

                forceSimulation.alphaTarget(0.01);
            });
        
            const updateNodes = (): void => {
                nodes.attr('d', (d: any) => {
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
                })
            }
        
            const updateLinks = (): void => {
                links.attr('d', (d: any) => {
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
                
                linkMarkerPaths.attr('d', (d: any) => {
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
        
            const updateGroups = (): void => {
                groupIds.forEach(function(groupId) {
                    const scaleFactor: number = 1.4;
                    let centroid: [number, number];
                    var path = paths.filter(d => d === groupId)
                        .attr('transform', 'scale(1) translate(0,0)')
                        .attr('d', d => {
                            let polygon = polygonGenerator(d, d3.selectAll('.node'));    
                            centroid = d3.polygonCentroid(polygon);
                            const valueline = d3.line()
                                .x(function(d) { return d[0]; })
                                .y(function(d) { return d[1]; })
                                .curve(d3.curveCatmullRomClosed)
                            return valueline(polygon.map(point => [  point[0] - centroid[0], point[1] - centroid[1] ]));
                        });
                  d3.select(path.node().parentNode).attr('transform', 'translate('  + centroid[0] + ',' + (centroid[1]) + ') scale(' + scaleFactor + ')');
                });
            };
        
            return {
                destroy: () => {
                    svg.selectAll('*').remove();
                    forceSimulation.stop();
                },
                nodes: () => {
                    return svg.nodes();
                }
            }
        },
        [width, height, fileVersionLinksData, networkActivityLinksData, displayedLinks, linkMouseOver, displayedNodes, nodeMouseOver, forceSimulation, groupIds, hostColorScale],
    );

    useEffect(() => {
        setDisplayedNodes(
            [...endpointsData, ...filesData, ...portsData, ...processesData]
                .filter(node => !hiddenHosts.includes(node.hostName))
                .filter(node => !hiddenNodeTypes.includes(node.__typename))
        );
    }, [endpointsData, filesData, hiddenHosts, hiddenNodeTypes, portsData, processesData])

    useEffect(() => {
        setDisplayedLinks(
            [...portLinksData, ...fileVersionLinksData, ...networkActivityLinksData]
                .filter(link => displayedNodes.includes(link.source) && displayedNodes.includes(link.target))
        );
    }, [displayedNodes, fileVersionLinksData, networkActivityLinksData, portLinksData])

    useEffect(() => {
        let destroyFn;
 
        if (svgRef.current) {
            const { destroy } = runForceGraph(
                svgRef.current,
                );
            destroyFn = destroy;
        }
        return destroyFn;
    }, [runForceGraph, svgRef]);

    return ( 
        <React.Fragment>
            <svg
                ref={svgRef}
                className='network-graph'
                width={width}
                height={height}/>
            {/* Host Legend */}
            <div className={clsx(classes.legend)}>
                <div className={clsx(classes.legendTitle)}>Hosts</div>
                <LegendOrdinal scale={hostColorScale} labelFormat={label => `${label.toUpperCase()}`}>
                    {labels => (
                        <div style={{display: 'flex', flexDirection: 'column', cursor: 'pointer'}}>
                            {labels.map((label, i) => (
                                <LegendItem
                                    key={`legend-host-${i}`}
                                    margin='0 0 5px'
                                    onClick={() => {
                                        setHiddenHosts(prevHosts => prevHosts.includes(label.datum) ? prevHosts.filter(host => host !== label.datum) : [...prevHosts, label.datum])
                                    }}
                                >
                                    <svg width='15' height='15'>
                                        <rect 
                                            fill={ hiddenHosts.includes(label.datum) ? '#fff' : label.value }
                                            stroke={label.value}
                                            strokeWidth='1.5'
                                            width='15' 
                                            height='15' />
                                    </svg>
                                    <LegendLabel align='left' margin='0 0 0 4px'>
                                        {label.text}
                                    </LegendLabel>
                                </LegendItem> 
                            ))}
                        </div>
                    )}
                </LegendOrdinal>
            </div>
            {/* Node Type legend */}
            <div className={clsx(classes.legend)} style={{left: '11%'}}>
                <div className={clsx(classes.legendTitle)}>Nodes</div>
                <Legend scale={shapeScale}>
                {labels => (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {labels.map((label, i) => {
                        const color = '#000';
                        const shape = shapeScale(label.datum);
                        return (
                        <LegendItem
                            key={`legend-node-${i}`}
                            margin='0 0 5px'
                            onClick={() => {
                                setHiddenNodeTypes(prevNodeTypes => prevNodeTypes.includes(label.datum) ? prevNodeTypes.filter(nodeType => nodeType !== label.datum) : [...prevNodeTypes, label.datum])
                            }}
                        >
                            <svg width={15} height={15}>
                                {React.isValidElement(shape)
                                    ? React.cloneElement(shape as React.ReactElement<{fill: any, stroke: any, strokeWidth: any}>, {
                                        fill: hiddenNodeTypes.includes(label.datum) ? '#fff' : '#000',
                                        stroke: '#000',
                                        strokeWidth: '2',
                                    })
                                    : React.createElement(shape as React.ComponentType<{ fill: string }>, {
                                        fill: color,
                                    })}
                            </svg>
                            <LegendLabel align="left" margin='0 0 0 4px'>
                                {label.text}
                            </LegendLabel>
                        </LegendItem>
                        );
                    })}
                    </div>
                )}
                </Legend>
            </div>
        </React.Fragment>);
});

function polygonGenerator(groupId: string, nodes: any) {
    const nodeCoords = nodes
        .filter((d: any) => d.hostName === groupId)
        .data()
        .map((d: any) => [d.x, d.y] as [number, number]);

    return d3.polygonHull(nodeCoords);
}

function nodeDragging (simulation: any, settings: any) {
    function dragStarted(event: any, node: any) {
        if(!event.active) simulation.alpha(0.9).restart();
    }

    function drag(event: any, node: any) {
        d3.select(this).attr('fx', node.x = event.x).attr('fy', node.y = event.y);
    }

    function dragStopped(event: any, node: any) {
        simulation.alpha(0.9).restart();
        d3.select(this)
            .attr('fx', node.x = event.x).attr('fy', node.y = event.y);
    }

    return d3.drag()
        .on('start', dragStarted)
        .on('drag', drag)
        .on('end', dragStopped);

}

function groupDragging (simulation: any, nodes: any) {
    function dragStarted(event: any, group: any) {
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

    function dragStopped(event: any, node: any) {
        simulation.alphaTarget(0.3).restart();
        d3.select(this).style('stroke-width', 1);
    }

    return d3.drag()
        .on('start', dragStarted)
        .on('drag', drag)
        .on('end', dragStopped);
}

function getLinkColor(link: any) {
    return connectionIntensityColorScale(link.byteProportion);
}