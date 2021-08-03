import { useAppSelector, useAppDispatch } from '../../../../../redux/hooks';
import { scaleLinear } from '@visx/scale';
import {AxisBottom, AxisLeft} from '@visx/axis';
import { Group } from '@visx/group';
import { GridRows, GridColumns } from '@visx/grid';
import { Circle, Line } from '@visx/shape';
import React, { useMemo, useRef } from 'react';
import { withTooltip, TooltipWithBounds, Tooltip, defaultStyles } from '@visx/tooltip';
import { WithTooltipProvidedProps } from '@visx/tooltip/lib/enhancers/withTooltip';
import { useTheme } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import { resetHoveredFile, setHoveredFile } from '../../../../../redux/analysisSlice';

type FileStats = {
    id: string,
    file: string,
    bytes: number,
    accesses: number,
}

function max<Datum>(data: Datum[], value: (d: Datum) => number): number {
    return Math.max(...data.map(value));
  }

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
        const dispatch = useAppDispatch();
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
                        id: node.id,
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

        const xScale = useMemo(() => 
            scaleLinear<number>({
                domain: [0, max(fileStats, d => d.accesses)],
                range: [0, xMax]
            }), 
        [fileStats, xMax]);

        const yScale = useMemo(() => 
            scaleLinear<number>({
                domain: [0, max(fileStats, d => d.bytes)],
                range: [yMax, 0]
            }),
        [fileStats, yMax]);

        return (
            <div>
                { 
                    fileStats.length > 0 && (
                        <svg width={width} height={height} ref={svgRef}>
                            <Group left={margin.left} top={margin.top}>
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
                                <GridColumns scale={xScale} width={width-margin.right} height={yMax} stroke="#e0e0e0" strokeDasharray="6 3"/>
                                <AxisBottom top={yMax} scale={xScale} numTicks={width > 520 ? 10 : 5} />
                                <text x={xMax - 50} y={yMax - 5} fontSize={10}>
                                    Versions [#]
                                </text>
                                <AxisLeft scale={yScale} numTicks={5}/>
                                <text x={-40} y={10} transform="rotate(-90)" fontSize={10}>
                                    Bytes [b]
                                </text>
                                <Group>
                                    {fileStats.map((d: FileStats, i: number) => (
                                        <Circle 
                                            key={`point-dst-${d.file}-${i}`}
                                            cx={xScale(d.accesses)}
                                            cy={yScale(d.bytes)}
                                            r={tooltipData && tooltipData.file === d.file ? 8 : 5}
                                            fill = {tooltipData && tooltipData.file === d.file ? theme.palette.secondary.main : theme.palette.secondary.light}
                                            stroke = {tooltipData && tooltipData.file === d.file ? theme.palette.secondary.main : '#fff'}
                                            onMouseLeave = {() => {
                                                dispatch(resetHoveredFile());
                                                hideTooltip();
                                            }}
                                            onMouseMove = {() => {
                                                dispatch(setHoveredFile(d.id));
                                                showTooltip({tooltipData: d, tooltipTop: yScale(d.bytes), tooltipLeft: xScale(d.accesses),
                                                });
                                            }}
                                        />
                                    ))}
                                </Group>
                            </Group>
                        </svg>
                    )
                }
                {
                     fileStats.length === 0 &&  (
                        <Typography variant="caption" display="block" gutterBottom>
                        No file versions within the selected analysis window.
                        </Typography>
                     )
                }
                {tooltipOpen && tooltipData && (
                    <React.Fragment>
                        <TooltipWithBounds top={tooltipTop - 35} left={tooltipLeft}>
                            <small>{tooltipData.file}</small>
                        </TooltipWithBounds>

                        <Tooltip
                            top = { tooltipTop - 10 }
                            left = { 0 }
                            style = {{
                                ...defaultStyles,
                            }}
                        >
                            <small><strong>{(tooltipData.bytes)}</strong></small>
                        </Tooltip>

                        <Tooltip
                            top = { yMax }
                            left = { tooltipLeft }
                            style = {{
                                ...defaultStyles,
                                transform: 'translateX(+25%)'
                            }}
                        >
                            <small><strong>{`${tooltipData.accesses} ${tooltipData.accesses === 1 ? 'version' : 'versions'}`}</strong></small>
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