import { useEffect, useRef } from 'react';
import { withTooltip} from '@visx/tooltip';
import { WithTooltipProvidedProps } from '@visx/tooltip/lib/enhancers/withTooltip';
import * as d3 from 'd3';
import { scaleLinear, scaleOrdinal } from '@visx/scale';
import forceInABox from './forceInABox';
import { FileNodeType, PortNodeType, ProcessNodeType } from './mockdata';

declare global {
    interface Window {
        forceInABox: () => any; 
    }
}

const nodeTypeColorScale = scaleOrdinal({
    range: [...d3.schemeTableau10],
    domain: ['a', 'b', 'c', 'local']
});

const connectionIntensityColorScale = scaleLinear({
    domain: [0, 1],
	range: ['#425fbd', '#d93b26'],
})

const settings = {
    nodeRadius: 20,
    nodeStrokeWidth: 2,
    hoverFactor: 0.25,
};

type EventTimeLineProps = {
    width: number;
    height: number;
    processNodes: any;
    portNodes: any;
    fileNodes: any;
    endpointNodes: any;
    portLinks: any;
    fileVersionLinks: any;
    networkActivityLinks: any;
}

export default withTooltip<EventTimeLineProps, any>(
    ({width, height, processNodes, portNodes, fileNodes, endpointNodes, portLinks, fileVersionLinks, networkActivityLinks, showTooltip, hideTooltip}: EventTimeLineProps & WithTooltipProvidedProps<any>) => {

    const wrapperRef = useRef<HTMLDivElement>();

    useEffect(() => {
        let destroyFn;
 
        if (wrapperRef.current) {
            const { destroy } = runForceGraph(
                wrapperRef.current,
                width,
                height,
                processNodes,
                portNodes,
                fileNodes,
                endpointNodes,
                portLinks,
                fileVersionLinks,
                networkActivityLinks,
                );
            destroyFn = destroy;
        }
        return destroyFn;
    }, [wrapperRef, width, height, processNodes, fileNodes, portNodes, endpointNodes, portLinks, fileVersionLinks, networkActivityLinks]);

    return  <div ref={wrapperRef} style={{width: width, height: height-15}}/>
});

function runForceGraph(
    container: HTMLDivElement,
    width: number,
    height: number,
    processNodeData,
    portNodeData,
    fileNodeData,
    endpointData,
    portLinkData,
    fileVersionLinkData,
    networkActivityLinkData
) {

    const groupIdsMap = new Map();
    [...processNodeData, ...portNodeData, ...fileNodeData, ...endpointData].forEach((node: any) => {
        if(groupIdsMap.get(node.hostName)) {
            groupIdsMap.set(node.hostName, {hostName: node.hostName, count: groupIdsMap.get(node.hostName).count + 1})
        } else {
            groupIdsMap.set(node.hostName, {hostName: node.hostName, count: 1})
        }
    });

    const groupIdsArray = Array.from(groupIdsMap)
        .filter(element => element[1].count > 2)
        .map(element => element[1].hostName);

    let groupingForce: any = forceInABox();

    const forceSimulation = d3
        .forceSimulation()
        .nodes([...processNodeData, ...portNodeData, ...fileNodeData, ...endpointData])
        .force("group", groupingForce
            .template('force') // Either treemap or force
            .groupBy("hostName") // Nodes' attribute to group
            .strength(0.2) // Strength to foci
            .links([...portLinkData, ...fileVersionLinkData, ...networkActivityLinkData]) // The graph links. Must be called after setting the grouping attribute (Force template only)
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
            d3.forceLink([...fileVersionLinkData, ...networkActivityLinkData])
                .distance(5)
                .strength(groupingForce.getLinkStrength))
        .force('portLinks',
            d3.forceLink(portLinkData)
                .distance(40)
                .strength(.9));
        
    const svg = d3.select(container).append('svg')
        .attr('width', width)
        .attr('height', height > 15 ? height-15 : height)
        .attr('viewBox', `${-width / 2} ${-height / 2} ${width} ${height > 15 ? height-15: height}`);
    
    const arrowheads = svg.append('defs')
        .attr('class', 'markers')
        .selectAll('.marker')
        .data([...fileVersionLinkData, ...networkActivityLinkData])
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

    const portLinks = svg.append('g')
        .attr('class', 'portLinks')
        .selectAll('.port-link')
        .data(portLinkData)
        .join('line')
        .attr('id', (d: any) => d.id)
        .attr('class', 'port-link')
        .attr('stroke', '#999')
        .attr('fill', 'none')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', 2);

    const fileVersionLinks = svg.append('g')
        .attr('class', 'fileVersionLinks')
        .selectAll('.file-version-link')
        .data(fileVersionLinkData)
        .join('line')
        .attr('id', (d: any) => d.id)
        .attr('class', 'file-version-link')
        .attr('stroke', (d: any) => getLinkColor(d))
        .attr('fill', 'none')
        .attr('stroke-width', 3)
        .on('mouseover', linkMouseOver)
        .on('mouseout', mouseOut);

    const fileVersionMarkerPath = svg.append('g')
        .attr('class', 'fileVersionMarkerPath')
        .selectAll('path.marker')
        .data(fileVersionLinkData)
        .join('path')
        .attr('stroke-opacity', .5)
        .attr('stroke-width', 1.5)
        .attr('marker-mid', (d: any) => `url(#${d.id}_arrowhead)`);

    const networkActivityLinks = svg.append('g')
        .attr('class', 'networkActivityLinks')
        .selectAll('path.marker')
        .data(networkActivityLinkData)
        .join('path')
        .attr('id', (d: any) => d.id)
        .attr('class', 'network-activity-link')
        .attr('stroke', (d: any) => getLinkColor(d))
        .attr('fill', 'none')
        .attr('stroke-width', 3)
        .on('mouseover', linkMouseOver)
        .on('mouseout', mouseOut);

    const networkActivityMarkerPath = svg.append('g')
        .attr('class', 'networkActivityMarkerPath')
        .selectAll('path.marker')
        .data(networkActivityLinkData)
        .join('path')
        .attr('fill', 'none')
        .attr('stroke-opacity', .5)
        .attr('stroke-width', 1.5)
        .attr('marker-end', (d: any) => `url(#${d.id}_arrowhead)`);

    const processNodes = svg.append('g')
        .attr('class', 'processNodes')
        .selectAll('.process-node')
        .data(processNodeData)
        .join('circle')
        .attr('class', 'process-node')
        .attr('id', (d: ProcessNodeType) => d.id)
        .attr('stroke', '#fff')
        .attr('stroke-width', settings.nodeStrokeWidth)
        .attr('r', settings.nodeRadius)
        .attr('fill', (d: any) => nodeTypeColorScale(d.hostName))
        .on('mouseover', nodeMouseOver)
        .on('mouseout', mouseOut)
        .call(nodeDragging(forceSimulation, settings));

    processNodes.append('title')
        .text((process: any) => process.name);
    
    const portNodes = svg.append('g')
        .attr('class', 'portNodes')
        .selectAll('.port-node')
        .data(portNodeData)
        .join('path')
        .attr('class', 'port-node')
        .attr('id', (d: PortNodeType) => d.id)
        .attr('stroke', '#fff')
        .attr('stroke-width', settings.nodeStrokeWidth)
        .attr('fill', (d: any) => nodeTypeColorScale(d.hostName))
        .on('mouseover', nodeMouseOver)
        .on('mouseout', mouseOut)
        .call(nodeDragging(forceSimulation, settings))
        
    portNodes.append('title')
        .text((port: any) => `:${port.portNumber}`);

    const fileNodes = svg.append('g')
        .attr('class', 'fileNodes')
        .selectAll('.file-node')
        .data(fileNodeData)
        .join('path')
        .attr('class', 'file-node')
        .attr('id', (d: FileNodeType) => d.id)
        .attr('stroke', '#fff')
        .attr('stroke-width', settings.nodeStrokeWidth)
        .attr('fill', (d: any) => nodeTypeColorScale(d.hostName))
        .on('mouseover', nodeMouseOver)
        .on('mouseout', mouseOut)
        .call(nodeDragging(forceSimulation, settings));

    fileNodes.append('title')
        .text((file: any) => `${file.path}/${file.name}`);

    const endpointNodes = svg.append('g')
        .attr('class', 'endpointNodes')
        .selectAll('.endpoint-node')
        .data(endpointData)
        .join('rect')
        .attr('class', 'endpoint-node')
        .attr('id', (d: any) => d.id)
        .attr('stroke', '#fff')
        .attr('stroke-width', settings.nodeStrokeWidth)
        .attr('width', settings.nodeRadius * 2)
        .attr('height', settings.nodeRadius * 2)
        .attr('fill', (d: any) => nodeTypeColorScale(d.hostName))
        .on('mouseover', nodeMouseOver)
        .on('mouseout', mouseOut)
        .call(nodeDragging(forceSimulation, settings));

    endpointNodes.append('title')
        .text((endpoint: any) => `${endpoint.hostIp} (${endpoint.hostName})`);

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
        .text((d:any) => {
            if (d.portNumber) return `:${d.portNumber}`; // port nodes
            if (d.type) return `.${d.type}`; // file nodes
            if (d.hostIp) return d.hostIp; // endpoint node
            return d.name; // default = process node
        })
        .on('mouseover', nodeMouseOver)
        .on('mouseout', mouseOut)
        .call(nodeDragging(forceSimulation, settings));

    const paths = groups.selectAll('.path_placeholder')
        .data(groupIdsArray, (d) => +d)
        .join('g')
        .attr('class', 'path_placeholder')
        .append('path')
        .attr('stroke', d => nodeTypeColorScale(d))
        .attr('stroke-opacity', 1)
        .attr('fill-opacity', 0.2)
        .attr('fill', d => nodeTypeColorScale(d))
        .attr('opacity', 0)
        .call(groupDragging(forceSimulation, [...processNodeData, ...portNodeData, ...fileNodeData, ...endpointData]));

    paths.transition().duration(1000)
        .attr('opacity', 1);

    forceSimulation.on('tick', () => {   
        updateNodes();
        updateLinks();
        updateGroups();

        nodeLabels.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    const updateNodes = (): void => {
        processNodes
            .attr('cx', (d: any) => d.x)
            .attr('cy', (d: any) => d.y);

        portNodes
            .attr('d', (d: any) => `
                    M ${d.x - settings.nodeRadius} ${d.y} 
                    L ${d.x} ${d.y + settings.nodeRadius} 
                    L ${d.x + settings.nodeRadius} ${d.y} 
                    L ${d.x} ${d.y - settings.nodeRadius}
                    Z`)

        fileNodes
            .attr('d', (d: any) => { 
                const triangleHeight = Math.sqrt(3) * (settings.nodeRadius * 0.9);
                return `
                M ${d.x} ${d.y - triangleHeight / 2 - 5}
                L ${d.x - settings.nodeRadius} ${d.y + triangleHeight/ 2 - 5}
                L ${d.x + settings.nodeRadius} ${d.y + triangleHeight / 2 - 5}
                Z`
            });

        endpointNodes
            .attr('x', (d: any) => d.x - settings.nodeRadius )
            .attr('y', (d: any) => d.y - settings.nodeRadius);
    }

    const updateLinks = (): void => {
        portLinks
            .attr('x1', (d: any) => d.source.x)
            .attr('y1', (d: any) => d.source.y)
            .attr('x2', (d: any) => d.target.x)
            .attr('y2', (d: any) => d.target.y);

        fileVersionLinks
            .attr('x1', (d: any) => d.source.x)
            .attr('y1', (d: any) => d.source.y)
            .attr('x2', (d: any) => d.target.x)
            .attr('y2', (d: any) => d.target.y);

        networkActivityLinks.attr('d', (d: any) => {
				const r = Math.hypot(d.target.x - d.source.x, d.target.y - d.source.y);
				return `
    			M${d.source.x},${d.source.y}
    			A${r},${r} 0 0,1 ${d.target.x},${d.target.y}
  			`;
		});

        fileVersionMarkerPath.attr('d', (d: any) => 
            `M ${d.source.x} ${d.source.y} 
            L ${(d.target.x + d.source.x) / 2} ${(d.target.y + d.source.y) / 2}
            L ${d.target.x} ${d.target.y}`
        );

        networkActivityMarkerPath.attr('d', (d: any) => {
            var dx = d.target.x - d.source.x,
                dy = d.target.y - d.source.y,
                dr = Math.sqrt(dx * dx + dy * dy);
        
            // We know the center of the arc will be some distance perpendicular from the
            // link segment's midpoint. The midpoint is computed as:
            var endX = (d.target.x + d.source.x) / 2;
            var endY = (d.target.y + d.source.y) / 2;
        
            // Notice that the paths are the arcs generated by a circle whose 
            // radius is the same as the distance between the nodes. This simplifies the 
            // trig as we can simply apply the 30-60-90 triangle rule to find the difference
            // between the radius and the distance to the segment midpoint from the circle 
            // center.
            var len = dr - ((dr/2) * Math.sqrt(3));
            
            // Remember that is we have a line's slope then the perpendicular slope is the 
            // negative inverse.
            endX = endX + (dy * len/dr);
            endY = endY + (-dx * len/dr);
              
            return `M ${d.source.x} ${d.source.y} A ${dr} ${dr} 0 0 1 ${endX} ${endY}`;
        });
    }

    const updateGroups = (): void => {
        groupIdsArray.forEach(function(groupId) {
            const scaleFactor: number = 1.4;
            let centroid: [number, number];
            var path = paths.filter(d => d === groupId)
                .attr('transform', 'scale(1) translate(0,0)')
                .attr('d', d => {
                    let polygon = polygonGenerator(d, d3.selectAll('.file-node, .process-node, .port-node, .endpoint-node'));    
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

    function linkMouseOver(event: any, link: any) {
        d3.selectAll('.file-node, .process-node, .port-node, .endpoint-node')
            .transition().duration(500)
            .attr('opacity', (d: any) => d.id === link.target.id || d.id === link.source.id ? 1 : .2)
            .attr('stroke', (d: any) => d.id === link.target.id || d.id === link.source.id ? nodeTypeColorScale(d.hostName) : '#fff');

        d3.selectAll('.port-link, .file-version-link, .network-activity-link')
            .transition().duration(500)
            .attr('opacity', (d: any) => link.id === d.id ? 1 : .2);

        nodeLabels
            .transition().duration(500)
            .attr('opacity', (d: any) => d.id === link.target.id || d.id === link.source.id ? 1 : .2);

        arrowheads
            .transition().duration(500)
            .attr('opacity', (d: any) => link.id === d.id ? 1 : .2);
    }

    function nodeMouseOver(event: any, node: any) {
        const neighborNodesIDs = [...portLinkData, ...fileVersionLinkData, ...networkActivityLinkData]
            .filter((link: any) => link.source.id === node.id || link.target.id === node.id)
            .map((link: any) => link.source.id === node.id ? link.target.id : link.source.id);

        d3.selectAll('.file-node, .process-node, .port-node, .endpoint-node')
            .transition().duration(500)
            .attr('opacity', (d: any) => node.id === d.id || neighborNodesIDs.indexOf (d.id) > -1 ? 1 : .2)
            .attr('stroke', (d: any) => node.id === d.id || neighborNodesIDs.indexOf (d.id) > -1 ? nodeTypeColorScale(d.hostName) : '#fff');
    
        d3.selectAll('.port-link, .file-version-link, .network-activity-link')
            .transition().duration(500)
            .attr('opacity', (d: any) => (node.id === d.source.id || node.id === d.target.id) ? 1 : .2);

        nodeLabels
            .transition().duration(500)
            .attr('opacity', (d: any) => node.id === d.id || neighborNodesIDs.indexOf (d.id) > -1 ? 1 : .2);

        arrowheads
            .transition().duration(500)
            .attr('opacity', (d: any) => (node.id === d.source.id || node.id === d.target.id) ? 1 : .2);
    }
    
    function mouseOut() {
        d3.selectAll('.file-node, .process-node, .port-node, .endpoint-node')
            .transition().duration(250)
            .attr('opacity', 1)
            .attr('stroke', '#fff');
    
        d3.selectAll('.port-link, .file-version-link, .network-activity-link')
            .transition().duration(250)
            .attr('opacity', 1);

        nodeLabels
            .transition().duration(250)
            .attr('opacity', 1);

        arrowheads
            .transition().duration(250)
            .attr('opacity', 1);
    }

    return {
        destroy: () => {
            svg.remove();
            forceSimulation.stop();
        },
        nodes: () => {
            return svg.nodes();
        }
    }
}

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