import {useMemo, useRef, useState} from 'react';
import { useTheme } from '@material-ui/core/styles';
import { scaleTime, scaleLinear, scaleBand } from '@visx/scale';
import {AxisBottom, AxisLeft} from '@visx/axis';
import { Brush } from '@visx/brush';
import { Group } from '@visx/group';
import { Bar} from "@visx/shape";
import { Bounds } from '@visx/brush/lib/types';
import BaseBrush from '@visx/brush/lib/BaseBrush';
import { max } from 'd3-array';
import { DateTime } from 'luxon'; 

type EventTimeLineProps = {
    width: number;
    height: number;
    startDateTime: DateTime,
    endDateTime: DateTime,
	data: any[];
    brushedData: any[];
	onBrushChange(domain: Bounds | null): void;
	onBrushReset(): void;
}

const margin = {top: 8, left: 30, bottom: 19, right: 10};
const selectedBrushStyle = { fill: '#919191', opacity: 0.5, stroke: 'white' };

export default function EventTimeline(props: EventTimeLineProps) {
    const theme = useTheme();
    const brushRef = useRef<BaseBrush | null>(null);
    const [brushed, setBrushed] = useState<boolean>(false);

    //dimensions
    const innerHeight = props.height - margin.top - margin.bottom;
    const chartHeight = innerHeight - margin.bottom;

    //bounds
    const xMax = Math.max(props.width - margin.left - margin.right, 0);
    const yMax = Math.max(chartHeight, 0);

    //scales
    const xTimeScale = useMemo(
        () => scaleTime<number>({
            range: [0, xMax],
            domain: [props.startDateTime.toMillis(), props.endDateTime.toMillis()]
        }),
        [xMax, props.startDateTime, props.endDateTime]
    );
    const xBandScale = useMemo(
        () => scaleBand<number>({
            range: [0, xMax],
            domain: props.data.map((d: any) => d.timestamp),
            padding: 0.025
        }),
        [xMax, props.data]
    );
    const yScale = useMemo(
        () => scaleLinear<number>({
            range: [yMax, 0],
            domain: [0, max(props.data.map((d: any) => d.count))],
            nice: true
        }),
        [yMax, props.data]
    );

    //brush behaviour
    const onBrushReset = () => {
        if(brushRef?.current) brushRef.current.reset();
        setBrushed(false);
        props.onBrushReset();
    }

    //HTML
    return (
        <svg width={props.width} height={props.height}>
            <Group left={margin.left} top={margin.top}>
                {props.data.map(d => {
                    const barX = xBandScale(d.timestamp) || 0;
                    const barY = yScale(d.count);
                    const barWidth = xBandScale.bandwidth();
                    const barHeight = yMax - barY < 0 ? 0 : (d.count === 0 ? 0 : yMax - barY);
                    const color = theme.palette.primary.light;
                    const opacity = brushed ? 0.2 : 1
                    return (
                        <Bar
                            key={`bar-count-${d.timestamp}`}
                            x={barX}
                            y={barY}
                            width={barWidth}
                            height={barHeight}
                            fill={color} 
                            opacity={opacity}/>
                    );
                })}
                 {props.brushedData.map(d => {
                    const barX = xBandScale(d.timestamp) || 0;
                    const barY = yScale(d.count);
                    const barWidth = xBandScale.bandwidth();
                    const barHeight = yMax - barY < 0 ? 0 : (d.count === 0 ? 0 : yMax - barY);
                    const color = theme.palette.primary.light;
                    return (
                        <Bar
                            key={`bar-count-${d.timestamp}`}
                            x={barX}
                            y={barY}
                            width={barWidth}
                            height={barHeight}
                            fill={color} />
                    );
                })}
                <Brush
                    xScale={xTimeScale}
                    yScale={yScale}
                    width={xMax}
                    height={yMax}
                    handleSize={1}
                    resizeTriggerAreas={['left', 'right']}
                    brushDirection="horizontal"
                    onChange = {(domain: any) => {props.onBrushChange(domain); domain ? setBrushed(true) : setBrushed(false);}}
                    onClick = {onBrushReset}
                    selectedBoxStyle= {selectedBrushStyle}
                    innerRef={brushRef} />
                <AxisLeft
                    scale={yScale}
                    numTicks={4} />
                <AxisBottom
                    top={yMax}
                    scale={xTimeScale} />
            </Group>
        </svg>
    );
}
