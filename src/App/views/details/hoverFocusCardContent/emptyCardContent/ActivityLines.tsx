import { useAppSelector } from '../../../../../redux/hooks';
import { scaleBand, scaleLinear, scaleOrdinal } from '@visx/scale';
import {AxisBottom, AxisLeft} from '@visx/axis';
import { Group } from '@visx/group';
import { GridRows, GridColumns } from '@visx/grid';
import { Line, Bar, BarStack } from '@visx/shape';
import { useCallback, useMemo, useRef, useState } from 'react';
import { withTooltip, TooltipWithBounds, Tooltip, defaultStyles } from '@visx/tooltip';
import { WithTooltipProvidedProps } from '@visx/tooltip/lib/enhancers/withTooltip';
import { timeFormat } from 'd3';
import { DateTime } from 'luxon';
import { useTheme } from '@material-ui/core/styles';
import React from 'react';
import { LegendOrdinal } from '@visx/legend';
import { localPoint } from '@visx/event';
import Typography from '@material-ui/core/Typography';

type FileStats = {
    file: string,
    bytes: number,
    accesses: number,
}

function max<Datum>(data: Datum[], value: (d: Datum) => number): number {
    return Math.max(...data.map(value));
  }

const margin = { top: 20, right: 20, bottom: 60, left: 60 };

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
    tooltipLeft = 0}: props & WithTooltipProvidedProps<any>) => {

        const theme = useTheme();
        const { dataBuckets, brushedBuckets, aggregationGranularity } = useAppSelector(state => state.analysisSliceReducer);
        const xMax = width - margin.left - margin.right;
        const yMax = height - margin.top - margin.bottom;
        const svgRef = useRef<SVGSVGElement>(null);

        const bucketAxisTimeFormat = (date: any): any => {
            const startDateTime = DateTime.fromMillis(date);
            const endDateTime = startDateTime.plus({milliseconds: aggregationGranularity});
            return timeFormat(
                `${startDateTime.toFormat('dd.LL, HH:mm:ss')} 
                - ${endDateTime.toFormat('dd.LL, HH:mm:ss')}`
            );
        }

        const data = useMemo(() => {
            const tmp = [];
            if(brushedBuckets.length < 1) {
                dataBuckets.forEach((bucket: any) => { 
                    tmp.push({timestamp: bucket.timestamp + aggregationGranularity / 2, network: bucket.networkActivity.length, file: bucket.fileVersion.length})
                });
            } else {
                brushedBuckets.forEach((bucket: any) => { 
                    tmp.push({timestamp: bucket.timestamp + aggregationGranularity / 2, network: bucket.networkActivity.length, file: bucket.fileVersion.length})
                });
            }
            
            return tmp;
        }, [aggregationGranularity, brushedBuckets, dataBuckets]);

        const maxData = useMemo(() => max(data, d => d.network + d.file), [data]);

        const yScale = useMemo(() => 
            scaleLinear<number>({
                domain: [0, maxData],
                range: [yMax, 0]
            }), 
        [maxData, yMax]);

        const xScale = useMemo(() => 
            scaleBand<number>({
                range: [0, xMax],
                domain: data.map((d: any) => d.timestamp),
                padding: 0.075
            }),
        [data, xMax]);

        const colorScale = scaleOrdinal<'network' | 'file', string>({
            domain: ['network', 'file'],
            range: [theme.palette.primary.main, theme.palette.secondary.main],
          });

        const [hoveredBarStack, setHoveredBarStack] = useState(null);
		const getOpacity = (key, index) => {
			if (hoveredBarStack) {
				return index === hoveredBarStack.index	? 1 : 0.7;
			} else {
				return 0.7;
			}
		};

        const handleTooltip = useCallback(
            (event: any) => {
                const point = localPoint(event) || {
					x: 0,
					y: 0
				};
				const tempIndex = Math.floor((point.x - margin.left) / xScale.step());
				const index = Math.max(0, Math.min(tempIndex, xScale.domain().length-1));
				// const bin = data.get(Math.floor(binTimestamp / aggregationGranularity));

				setHoveredBarStack({
					index: index,
				});

                showTooltip({
					tooltipData: data[index],
					tooltipLeft: xScale(data[index].timestamp) + xScale.bandwidth() / 2
				})
            },
            [data, showTooltip, xScale],
        )

        return (
            <div>
                {
                     dataBuckets.length > 0 && maxData > 0 &&  (
                        <svg width={width} height={height} ref={svgRef}>
                            <Group left={margin.left} top={margin.top}>
                                <GridRows scale={yScale} width={xMax} height={yMax} stroke="#e0e0e0" strokeDasharray="6 3" numTicks={5} />
                                <GridColumns scale={xScale} width={width-margin.right} height={yMax} stroke="#e0e0e0" strokeDasharray="6 3"/>
                                <text x={-50} y={10} transform="rotate(-90)" fontSize={10}>
                                    Activities #
                                </text>
                                <Group>
                                    <BarStack
                                        data={data}
                                        keys={['network', 'file']}
                                        x={(d) => d.timestamp}
                                        xScale={xScale}
                                        yScale={yScale}
                                        color={(k) => colorScale(k)}>
                                            { barStacks =>
                                                barStacks.map(barStack =>
                                                    barStack.bars.map(bar =>
                                                        <rect 
                                                            key={`bar-stack-${barStack.index}-${bar.index}`}
                                                            x={bar.x}
                                                            y={bar.y}
                                                            height={bar.height > 0 ? bar.height : 0}
                                                            width={bar.width}
                                                            fill={bar.color}
                                                            opacity={getOpacity(bar.key, bar.index)}
                                                        />
                                                    )
                                                )
                                            }
                                    </BarStack>
                                    <Bar
                                        x = {0}
                                        y={0}
                                        width={xMax < 0 ? 0 : xMax}
                                        height={yMax < 0 ? 0 : yMax}
                                        fill="transparent"
                                        rx={14}
                                        onTouchStart={handleTooltip}
                                        onTouchMove={handleTooltip}
                                        onMouseMove={handleTooltip}
                                        onMouseLeave={() => { hideTooltip(); setHoveredBarStack(null); } }/>
                                </Group>
                                {tooltipData && (
                                    <Line
                                        from={{ x: tooltipLeft, y: 0 }}
                                        to={{ x: tooltipLeft, y: yMax }}
                                        stroke="#919191"
                                        strokeWidth={1}
                                        pointerEvents="none"
                                        strokeDasharray="5,2"	/>
                                )}
                                <LegendOrdinal scale={colorScale} direction="row" labelMargin="0 15px 0 0"/>
                                <AxisBottom top={yMax} scale={xScale} numTicks={width > 520 ? 5 : 2} tickFormat={bucketAxisTimeFormat}/>
                                <AxisLeft scale={yScale} numTicks={5}/>
                            </Group>
                        </svg>
                     )
                }
                {
                     (dataBuckets.length === 0 || maxData === 0) &&  (
                        <Typography variant="caption" display="block" gutterBottom>
                            No system activity within the selected analysis window.
                        </Typography>
                     )
                }
                {tooltipOpen && tooltipData && (
                    <div>

                        <TooltipWithBounds top={tooltipTop} left={tooltipLeft}>
                            <div>
                                <div style={{color: colorScale('file')}}>
                                    <small><strong>{tooltipData.file}</strong> file {tooltipData.file === 1 ? 'version' : 'versions'}</small>
                                </div>
                                <div style={{color: colorScale('network')}}>
                                    <small><strong>{tooltipData.network}</strong> network {tooltipData.network === 1 ? 'activity' : 'activities'}</small>
                                </div>
                                
                            </div>
                        </TooltipWithBounds>

                        <Tooltip
                            top={yMax + margin.top}
                            left={tooltipLeft}
                            style={{
                                ...defaultStyles,
                                fontSize: '11px',
                                width: 160,
                                //minWidth: 72,
                                //textAlign: 'center',
                                transform: 'translateX(-25%)'
                            }}
                        >
                            <strong>
                                {`${DateTime.fromMillis(tooltipData.timestamp).toFormat('MMM dd, yyyy - HH:mm:ss')}`} to {`${DateTime.fromMillis(tooltipData.timestamp + aggregationGranularity).toFormat('MMM dd, yyyy - HH:mm:ss')}`}
                            </strong>
                        </Tooltip>
                    </div>
                )}
            </div>
        )
    }
);