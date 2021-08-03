import { useAppSelector, useAppDispatch } from '../../../../../redux/hooks';
import { scaleLinear, scaleOrdinal } from '@visx/scale';
import {AxisBottom, AxisLeft} from '@visx/axis';
import { Group } from '@visx/group';
import { GridRows, GridColumns } from '@visx/grid';
import { Line, Circle } from '@visx/shape';
import React, { useMemo, useRef } from 'react';
import { withTooltip, TooltipWithBounds, Tooltip, defaultStyles } from '@visx/tooltip';
import { WithTooltipProvidedProps } from '@visx/tooltip/lib/enhancers/withTooltip';
import { schemeTableau10 } from 'd3';
import Typography from '@material-ui/core/Typography';
import { resetHoveredEnpoint, setHoveredEndpoint } from '../../../../../redux/analysisSlice';

type EndpointStats = {
    endpoint: string,
    receivedBytes: number,
    srcAccesses: number,
    sentBytes: number,
    dstAccesses: number,
}

function max<Datum>(data: Datum[], value: (d: Datum) => number): number {
    return Math.max(...data.map(value));
  }
  
/* function min<Datum>(data: Datum[], value: (d: Datum) => number): number {
    return Math.min(...data.map(value));
} */

const margin = { top: 10, right: 20, bottom: 60, left: 60 };

type props = {
    width: number,
    height: number,
}

export default withTooltip<props, EndpointStats>(({
    width,
    height,
    showTooltip,
    hideTooltip,
    tooltipOpen,
    tooltipData,
    tooltipTop = 0,
    tooltipLeft = 0}: props & WithTooltipProvidedProps<EndpointStats>) => {

        const { displayedNodes, displayedLinks, activeHosts } = useAppSelector(state => state.analysisSliceReducer);
        const dispatch = useAppDispatch();
        const xMax = width - margin.left - margin.right;
        const yMax = height - margin.top - margin.bottom;
        const svgRef = useRef<SVGSVGElement>(null);

        const hostColorScale = useMemo(() => scaleOrdinal({range: [...schemeTableau10], domain: activeHosts}), [activeHosts]);

        const endpointsStatsMap: Map<string, EndpointStats> = useMemo(() => {
            const map = new Map<string, EndpointStats>();
            displayedNodes
                .filter((node: any) => node.__typename === 'EndPoint')
                .forEach((node: any) => {
                    map.set(node.id, {
                        endpoint: node.id,
                        receivedBytes: 0, 
                        srcAccesses: 0,
                        sentBytes: 0,
                        dstAccesses: 0,
                    });
                });
            return map;
        }, [displayedNodes]);

        const endpointStats: EndpointStats[] = useMemo(() => {
            displayedLinks
                .filter((link: any) => link.__typename === 'NetworkActivityLink')
                .forEach((link: any) => {
                    const src: string = link.source.split(':')[0];
                    const dst: string = link.target.split(':')[0];

                    const sent: boolean = src === '10.0.0.12' ? true : false;

                    const stats: EndpointStats = sent ? endpointsStatsMap.get(dst) : endpointsStatsMap.get(src);
                    if (sent) {
                        stats.sentBytes += link.overallLinkBytes;
                    } else {
                        stats.receivedBytes += link.overallLinkBytes;
                    }

      /*               const srcStats: EndpointStats = endpointsStatsMap.get(src);
                    srcStats.srcAccesses += link.activities.length;
                    srcStats.receivedBytes += link.overallLinkBytes;
                    endpointsStatsMap.set(src, srcStats);

                    const dstStats: EndpointStats = endpointsStatsMap.get(dst);
                    dstStats.dstAccesses += link.activities.length;
                    dstStats.sentBytes += link.overallLinkBytes;
                    endpointsStatsMap.set(dst, dstStats); */
                });

            endpointsStatsMap.delete('10.0.0.12');
            return Array.from(endpointsStatsMap).map((d: [string, EndpointStats]) => d[1]);
        }, [displayedLinks, endpointsStatsMap]);

    /*     const top5EndpointsBySrcBytes: EndpointStats[] = useMemo(() => 
            endpointStats.sort((a: EndpointStats, b: EndpointStats) => a.srcBytes > b.srcBytes ? -1 : 1).slice(0, 5)
        , [endpointStats]); */

        const xScale = useMemo(() => 
            scaleLinear<number>({
                domain: [0, max(endpointStats, d => d.sentBytes)],
                range: [0, xMax]
            }), 
        [endpointStats, xMax]);

        const yScale = useMemo(() => 
            scaleLinear<number>({
                domain: [0, max(endpointStats, d => d.receivedBytes)],
                range: [yMax, 0]
            }),
        [endpointStats, yMax]);

        return (
            <div>
                {
                     endpointStats.length > 0 &&  (
                        <svg width={width} height={height} ref={svgRef}>
                            <Group top={margin.top} left={margin.left}>
                                {tooltipData && (
                                    <Group>
                                        <Line
                                            from={{ x: tooltipLeft, y: 0 }}
                                            to={{ x: tooltipLeft, y: yMax }}
                                            stroke="#919191"
                                            strokeWidth={1}
                                            pointerEvents="none"
                                            strokeDasharray="5,2"	/>
                                        <Line
                                            from={{ x: 0, y: tooltipTop }}
                                            to={{ x: xMax, y: tooltipTop }}
                                            stroke="#919191"
                                            strokeWidth={1}
                                            pointerEvents="none"
                                            strokeDasharray="5,2"	/>
                                    </Group>
                                    
                                )}
                                <GridRows scale={yScale} width={xMax} height={yMax} stroke="#e0e0e0" strokeDasharray="6 3" />
                                <GridColumns scale={xScale} width={xMax} height={yMax} stroke="#e0e0e0" strokeDasharray="6 3"/>
                                <AxisBottom top={yMax} scale={xScale} numTicks={width > 520 ? 10 : 5} />
                                <text x={xMax - 50} y={yMax - 5} fontSize={10}>
                                    Sent Bytes
                                </text>
                                <AxisLeft scale={yScale} numTicks={5}/>
                                <text x={-75} y={10} transform="rotate(-90)" fontSize={10}>
                                    Received Bytes
                                </text>
                                <Group>
                                    {endpointStats.map((d: EndpointStats, i: number) => (
                                        <Circle 
                                            key={`point-src-${d.endpoint}-${i}`}
                                            cx={xScale(d.sentBytes)}
                                            cy={yScale(d.receivedBytes)}
                                            r={tooltipData && tooltipData.endpoint === d.endpoint ? 8 : 5}
                                            opacity = {tooltipData && tooltipData.endpoint === d.endpoint ? 1 : 0.7}
                                            fill = {hostColorScale(d.endpoint)}
                                            stroke = {tooltipData && tooltipData.endpoint === d.endpoint ? hostColorScale(d.endpoint) : '#fff'}
                                            onMouseLeave = {() => {
                                                dispatch(resetHoveredEnpoint());
                                                hideTooltip();
                                            }}
                                            onMouseMove = {() => {
                                                dispatch(setHoveredEndpoint(d.endpoint));
                                                showTooltip({tooltipData: d, tooltipTop: yScale(d.receivedBytes), tooltipLeft: xScale(d.sentBytes)});
                                            }}
                                        />
                                    ))}
                                </Group>
                            </Group>
                        </svg>
                     )
                }
                {
                     endpointStats.length === 0 &&  (
                        <Typography variant="caption" display="block" gutterBottom>
                        No network activities within the selected analysis window.
                        </Typography>
                     )
                }
                {tooltipOpen && tooltipData && (
                    <React.Fragment>
                        <TooltipWithBounds top={tooltipTop - 35} left={tooltipLeft}>
                            <div style={{ color: hostColorScale(tooltipData.endpoint) }}>
                                <small>{tooltipData.endpoint}</small>
                            </div>
                        </TooltipWithBounds>

                        <Tooltip
                            top = { tooltipTop - 10 }
                            left = { 0 }
                            style = {{
                                ...defaultStyles,
                            }}
                        >
                            <small><strong>{tooltipData.receivedBytes}</strong></small>
                        </Tooltip>

                        <Tooltip
                            top = { yMax }
                            left = { tooltipLeft }
                            style = {{
                                ...defaultStyles,
                                transform: 'translateX(+65%)'
                            }}
                        >
                            <small><strong>{tooltipData.sentBytes}</strong></small>
                        </Tooltip>
                    </React.Fragment>
                )}
            </div>
        )
    }
);

/* function formatByteString(bytes: number): string {
    if(bytes / 1000 > 1) {
        if(bytes / 1000000 > 1) {
            if(bytes / 1000000000 > 1) {
                if(bytes / 1000000000000 > 1) {
                    return `${(bytes / 1000000000000).toFixed(0)} PB`;
                } else {
                    return `${(bytes / 1000000000).toFixed(0)} GB`;
                }
            } else {
                return `${(bytes / 1000000).toFixed(0)} MB`;
            }
        } else {
            return `${(bytes / 1000).toFixed(0)} KB`;
        }
    } else {
        return `${bytes} B`;
    }
} */