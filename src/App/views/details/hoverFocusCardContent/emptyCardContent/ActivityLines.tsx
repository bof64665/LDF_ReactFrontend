import { useAppSelector } from '../../../../../redux/hooks';
import { scaleBand, scaleLinear, scaleOrdinal } from '@visx/scale';
import {AxisBottom, AxisLeft} from '@visx/axis';
import { Group } from '@visx/group';
import { GridRows, GridColumns } from '@visx/grid';
import { BarStack } from '@visx/shape';
import { useMemo, useRef } from 'react';
import { withTooltip, TooltipWithBounds } from '@visx/tooltip';
import { WithTooltipProvidedProps } from '@visx/tooltip/lib/enhancers/withTooltip';
import { timeFormat } from 'd3';
import { DateTime } from 'luxon';
import { useTheme } from '@material-ui/core/styles';
import React from 'react';
import { LegendOrdinal } from '@visx/legend';

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
    tooltipLeft = 0}: props & WithTooltipProvidedProps<FileStats>) => {

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

        //TODO: Legende
        //TODO: Hover
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
                range: [height-margin.bottom, margin.top]
            }), 
        [maxData, height]);

        const xScale = useMemo(() => 
            scaleBand<number>({
                range: [margin.left, width-margin.right],
                domain: data.map((d: any) => d.timestamp),
                padding: 0.075
            }),
        [data, width]);

        const colorScale = scaleOrdinal<'network' | 'file', string>({
            domain: ['network', 'file'],
            range: [theme.palette.primary.main, theme.palette.secondary.main],
          });

        return (
            <div>
                <svg width={width} height={height} ref={svgRef}>
                    <GridRows scale={yScale} left={margin.left} width={xMax} height={yMax} stroke="#e0e0e0" strokeDasharray="6 3" numTicks={5} />
                    <GridColumns scale={xScale} top={margin.top} width={width-margin.right} height={yMax} stroke="#e0e0e0" strokeDasharray="6 3"/>
                    <text x="-60" y="71" transform="rotate(-90)" fontSize={10}>
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
                                                opacity={0.75}
                                            />
                                        )
                                    )
                                }
                        </BarStack>
                    </Group>
                    <LegendOrdinal scale={colorScale} direction="row" labelMargin="0 15px 0 0"/>
                    <AxisBottom top={height-margin.bottom} scale={xScale} numTicks={width > 520 ? 5 : 2} tickFormat={bucketAxisTimeFormat}/>
                    <AxisLeft left={margin.left} scale={yScale} numTicks={5}/>
                </svg>
                {tooltipOpen && tooltipData && (
                    <TooltipWithBounds top={tooltipTop} left={tooltipLeft}>
                        <div style={{ color: '#bebebe' }}>
                        <strong>{tooltipData.file}</strong>
                        </div>
                        <div>
                        <small></small>
                        </div>
                    </TooltipWithBounds>
                )}
            </div>
        )
    }
);