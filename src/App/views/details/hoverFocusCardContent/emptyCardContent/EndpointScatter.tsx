import { useAppSelector } from '../../../../../redux/hooks';
import { scaleLinear } from '@visx/scale';
import {AxisBottom, AxisLeft} from '@visx/axis';
import { Group } from '@visx/group';
import { GridRows, GridColumns } from '@visx/grid';
import { Circle } from '@visx/shape';
import { useMemo, useRef } from 'react';
import { withTooltip, TooltipWithBounds } from '@visx/tooltip';
import { WithTooltipProvidedProps } from '@visx/tooltip/lib/enhancers/withTooltip';
import { useTheme } from '@material-ui/core/styles';

type EndpointStats = {
    endpoint: string,
    srcBytes: number,
    srcAccesses: number,
    dstBytes: number,
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

        const theme = useTheme();
        const { displayedNodes, displayedLinks } = useAppSelector(state => state.analysisSliceReducer);
        const xMax = width - margin.left - margin.right;
        const yMax = height - margin.top - margin.bottom;
        const svgRef = useRef<SVGSVGElement>(null);

        const endpointsStatsMap: Map<string, EndpointStats> = useMemo(() => {
            const map = new Map<string, EndpointStats>();
            displayedNodes
                .filter((node: any) => node.__typename === 'EndPoint')
                .forEach((node: any) => {
                    map.set(node.hostName, {
                        endpoint: node.hostName,
                        srcBytes: 0, 
                        srcAccesses: 0,
                        dstBytes: 0,
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

                    const srcStats: EndpointStats = endpointsStatsMap.get(src);
                    srcStats.srcAccesses += link.activities.length;
                    srcStats.srcBytes += link.overallLinkBytes;
                    endpointsStatsMap.set(src, srcStats);

                    const dstStats: EndpointStats = endpointsStatsMap.get(dst);
                    dstStats.dstAccesses += link.activities.length;
                    dstStats.dstBytes += link.overallLinkBytes;
                    endpointsStatsMap.set(dst, dstStats);
                });

            endpointsStatsMap.delete('10.0.0.3');
            return Array.from(endpointsStatsMap).map((d: [string, EndpointStats]) => d[1]);
        }, [displayedLinks, endpointsStatsMap]);

    /*     const top5EndpointsBySrcBytes: EndpointStats[] = useMemo(() => 
            endpointStats.sort((a: EndpointStats, b: EndpointStats) => a.srcBytes > b.srcBytes ? -1 : 1).slice(0, 5)
        , [endpointStats]); */

        //TODO: Legende!

        const xScale = useMemo(() => 
            scaleLinear<number>({
                domain: [0, max(endpointStats, d => d.srcAccesses)],
                range: [margin.left, width-margin.right]
            }), 
        [endpointStats, width]);

        const yScale = useMemo(() => 
            scaleLinear<number>({
                domain: [0, max(endpointStats, d => d.srcBytes)],
                range: [height-margin.bottom, margin.top]
            }),
        [endpointStats, height]);

        return (
            <div>
                <svg width={width} height={height} ref={svgRef}>
                    <GridRows scale={yScale} left={margin.left} width={xMax} height={yMax} stroke="#e0e0e0" strokeDasharray="6 3" />
                    <GridColumns scale={xScale} top={margin.top} width={width-margin.right} height={yMax} stroke="#e0e0e0" strokeDasharray="6 3"/>
                    <AxisBottom top={height-margin.bottom} scale={xScale} numTicks={width > 520 ? 10 : 5} />
                    <text x="410" y="195" fontSize={10}>
                        Packages [#]
                    </text>
                    <AxisLeft left={margin.left} scale={yScale}/>
                    <text x="-52" y="71" transform="rotate(-90)" fontSize={10}>
                        Bytes [b]
                    </text>
                    <Group>
                        {endpointStats.map((d: EndpointStats, i: number) => (
                            <Circle 
                                key={`point-src-${d.endpoint}-${i}`}
                                cx={xScale(d.srcAccesses)}
                                cy={yScale(d.srcBytes)}
                                r={5}
                                fill = {tooltipData && tooltipData.endpoint === d.endpoint ? theme.palette.primary.main : theme.palette.primary.light}
                                stroke = {tooltipData && tooltipData.endpoint === d.endpoint ? theme.palette.success.main : '#fff'}
                                onMouseLeave = {() => {
                                    hideTooltip();
                                }}
                                onMouseMove = {() => {
                                    const top = yScale(d.srcBytes);
                                    const left = xScale(d.srcAccesses);
                                    showTooltip({
                                        tooltipData: d,
                                        tooltipTop: top,
                                        tooltipLeft: left,
                                    });
                                }}
                            />
                        ))}
                    </Group>
                    <Group>
                        {endpointStats.map((d: EndpointStats, i: number) => (
                            <Circle 
                                key={`point-dst-${d.endpoint}-${i}`}
                                cx={xScale(d.dstAccesses)}
                                cy={yScale(d.dstBytes)}
                                r = {5}
                                fill = {tooltipData && tooltipData.endpoint === d.endpoint ? theme.palette.secondary.main : theme.palette.secondary.light}
                                stroke = {tooltipData && tooltipData.endpoint === d.endpoint ? theme.palette.success.main : '#fff'}
                                onMouseLeave = {() => {
                                    hideTooltip();
                                }}
                                onMouseMove = {() => {
                                    const top = yScale(d.dstBytes);
                                    const left = xScale(d.dstAccesses);
                                    showTooltip({
                                        tooltipData: d,
                                        tooltipTop: top,
                                        tooltipLeft: left,
                                    });
                                }}
                            />
                        ))}
                    </Group>
                </svg>
                {tooltipOpen && tooltipData && (
                    <TooltipWithBounds top={tooltipTop} left={tooltipLeft}>
                        <div style={{ color: '#bebebe' }}>
                        <strong>{tooltipData.endpoint}</strong>
                        </div>
                        <div>
                        <small>{formatByteString(tooltipData.srcBytes)} <strong>sent</strong> via {tooltipData.srcAccesses} activities</small>
                        </div>
                        <div>
                        <small>{formatByteString(tooltipData.dstBytes)} <strong>received</strong> via {tooltipData.dstAccesses} activities</small>
                        </div>
                    </TooltipWithBounds>
                )}
            </div>
        )
    }
);

function formatByteString(bytes: number): string {
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
}