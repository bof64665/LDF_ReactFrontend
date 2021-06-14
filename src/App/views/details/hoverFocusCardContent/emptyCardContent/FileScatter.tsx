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

type FileStats = {
    file: string,
    bytes: number,
    accesses: number,
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

export default withTooltip<props, FileStats>(({
    width,
    height,
    showTooltip,
    hideTooltip,
    tooltipOpen,
    tooltipData,
    tooltipTop = 0,
    tooltipLeft = 0}: props & WithTooltipProvidedProps<FileStats>) => {

        const theme = useTheme();
        const { displayedNodes, displayedLinks } = useAppSelector(state => state.analysisSliceReducer);
        const xMax = width - margin.left - margin.right;
        const yMax = height - margin.top - margin.bottom;
        const svgRef = useRef<SVGSVGElement>(null);

        const fileStatsMap: Map<string, FileStats> = useMemo(() => {
            const map = new Map<string, FileStats>();
            displayedNodes
                .filter((node: any) => node.__typename === 'File')
                .forEach((node: any) => {
                    map.set(node.path, {
                        file: node.name,
                        bytes: 0, 
                        accesses: 0,
                    });
                });
            return map;
        }, [displayedNodes]);

        const fileStats: FileStats[] = useMemo(() => {
            displayedLinks
                .filter((link: any) => link.__typename === 'FileVersionLink')
                .forEach((link: any) => {
                    const stats: FileStats = fileStatsMap.get(link.target);
                    stats.accesses += link.versions.length;
                    stats.bytes += link.overallLinkBytes;
                    fileStatsMap.set(link.target, stats);
                });
            return Array.from(fileStatsMap).map((d: [string, FileStats]) => d[1]);
        }, [displayedLinks, fileStatsMap]);

    /*     const top5EndpointsBySrcBytes: EndpointStats[] = useMemo(() => 
            endpointStats.sort((a: EndpointStats, b: EndpointStats) => a.srcBytes > b.srcBytes ? -1 : 1).slice(0, 5)
        , [endpointStats]); */

        const xScale = useMemo(() => 
            scaleLinear<number>({
                domain: [0, max(fileStats, d => d.accesses)],
                range: [margin.left, width-margin.right]
            }), 
        [fileStats, width]);

        const yScale = useMemo(() => 
            scaleLinear<number>({
                domain: [0, max(fileStats, d => d.bytes)],
                range: [height-margin.bottom, margin.top]
            }),
        [fileStats, height]);

        return (
            <div>
                <svg width={width} height={height} ref={svgRef}>
                    <GridRows scale={yScale} left={margin.left} width={xMax} height={yMax} stroke="#e0e0e0" strokeDasharray="6 3" />
                    <GridColumns scale={xScale} top={margin.top} width={width-margin.right} height={yMax} stroke="#e0e0e0" strokeDasharray="6 3"/>
                    <AxisBottom top={height-margin.bottom} scale={xScale} numTicks={width > 520 ? 10 : 5} />
                    <text x="410" y="195" fontSize={10}>
                        Versions [#]
                    </text>
                    <AxisLeft left={margin.left} scale={yScale}/>
                    <text x="-52" y="71" transform="rotate(-90)" fontSize={10}>
                        Bytes [b]
                    </text>
                    <Group>
                        {fileStats.map((d: FileStats, i: number) => (
                            <Circle 
                                key={`point-dst-${d.file}-${i}`}
                                cx={xScale(d.accesses)}
                                cy={yScale(d.bytes)}
                                r = {5}
                                fill = {tooltipData && tooltipData.file === d.file ? theme.palette.secondary.main : theme.palette.secondary.light}
                                stroke = {tooltipData && tooltipData.file === d.file ? theme.palette.success.main : '#fff'}
                                onMouseLeave = {() => {
                                    hideTooltip();
                                }}
                                onMouseMove = {() => {
                                    const top = yScale(d.bytes);
                                    const left = xScale(d.accesses);
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
                        <strong>{tooltipData.file}</strong>
                        </div>
                        <div>
                        <small>{formatByteString(tooltipData.bytes)} via {tooltipData.accesses} version</small>
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