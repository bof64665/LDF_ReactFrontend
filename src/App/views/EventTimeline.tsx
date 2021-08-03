import {useMemo, useRef, useState} from 'react';
import { scaleTime, scaleLinear, scaleBand } from '@visx/scale';
import {AxisBottom} from '@visx/axis';
import { Brush } from '@visx/brush';
import { Group } from '@visx/group';
import { Bar} from "@visx/shape";
import { Bounds } from '@visx/brush/lib/types';
import BaseBrush from '@visx/brush/lib/BaseBrush';
import { max } from 'd3-array';
import { timeFormat } from 'd3';
import { DateTime } from 'luxon';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { setBrush } from '../../redux/analysisSlice';

const margin = {top: 8, left: 10, bottom: 19, right: 10};
const selectedBrushStyle = { fill: '#919191', opacity: 0.5, stroke: 'white' };

const EventTimeline = ({
    width,
    height,
}: {
    width: number,
    height: number,
}) => {

    const dispatch = useAppDispatch();
    const {
        aggregationGranularity,
        startDateTime,
        endDateTime,
        dataBuckets
    } = useAppSelector(state => state.analysisSliceReducer);

    const brushRef = useRef<BaseBrush | null>(null);
    const [brushed, setBrushed] = useState<boolean>(false);
    const [brushedDataBuckets, setBrushedDataBuckets] = useState<any>([]);

    //dimensions
    const innerHeight = height - margin.top - margin.bottom;
    const chartHeight = innerHeight - margin.bottom;

    //bounds
    const xMax = Math.max(width - margin.left - margin.right, 0);
    const yMax = Math.max(chartHeight, 0);

    const dataBucketsMap = useMemo(() =>{
        const map = new Map<number, any>();
        dataBuckets.forEach((bucket: any) => map.set(parseInt(bucket.id), bucket));
        return map;
    }, [dataBuckets]);

    //scales
    const xTimeScale = useMemo(
        () => scaleTime<number>({
            range: [0, xMax],
            domain: [startDateTime, endDateTime]
        }),
        [xMax, startDateTime, endDateTime]
    );
    
    const xBandScale = useMemo(
        () => scaleBand<number>({
            range: [0, xMax],
            domain: dataBuckets.map((d: any) => d.timestamp),
            padding: 0.025
        }),
        [xMax, dataBuckets]
    );

    const yScale = useMemo(
        () => scaleLinear<number>({
            range: [yMax, 0],
            domain: [0, max(dataBuckets.map((d: any) => d.count))],
            nice: true
        }),
        [yMax, dataBuckets]
    );

    const bucketAxisTimeFormat = (date: any): any => {
        const startDateTime = DateTime.fromMillis(date);
        const endDateTime = startDateTime.plus({milliseconds: aggregationGranularity});
        return timeFormat(`${startDateTime.toFormat('dd.LL, HH:mm:ss')} \n- ${endDateTime.toFormat('dd.LL, HH:mm:ss')}`);
    }

    const handleBrushChange = (domain: Bounds | null) => {
        if (!domain) return;
        const { x0, x1 } = domain;

        const tempBrushedDataBuckets = new Map();
        const brushStartHash = Math.floor(x0 / aggregationGranularity);
        const brushEndHash = Math.floor(x1 / aggregationGranularity);
        dataBucketsMap.forEach((dataBucket, key) => {
            if( key >= brushStartHash && key <= brushEndHash ) {
                const tmpBucket = {
                    id: key,
                    timestamp: dataBucket.timestamp,
                    networkActivity: [],
                    fileVersion: [],
                }
                tmpBucket.networkActivity = dataBucket.networkActivity.filter((activity: any) => activity.timestamp >= x0 && activity.timestamp <= x1)
                tmpBucket.fileVersion = dataBucket.fileVersion.filter((version: any) => version.timestamp >= x0 && version.timestamp <= x1);
                tempBrushedDataBuckets.set(key, tmpBucket);
            } 
        });

        const buckets = Array.from(tempBrushedDataBuckets).map((d: any) => d[1])
        setBrushedDataBuckets(buckets);
        dispatch(setBrush({startTimestamp: x0, endTimeStamp: x1, buckets: buckets}));
    };

    const handleBrushReset = () => {
        if(brushRef?.current) brushRef.current.reset();
        setBrushed(false);
        dispatch(setBrush({startTimestamp: startDateTime, endTimeStamp: endDateTime, buckets: dataBuckets}));
        setBrushedDataBuckets([]);
    }

    //HTML
    return (
        <svg width={width} height={height}>
            <Group left={margin.left} top={margin.top}>
                {dataBuckets.map(d => {
                    const barX = xBandScale(d.timestamp) || 0;
                    const barY = yScale([...d.networkActivity, ...d.fileVersion].length);
                    const barWidth = xBandScale.bandwidth();
                    const barHeight = yMax - barY < 0 ? 0 : (d.count === 0 ? 0 : yMax - barY);
                    const color = '#666666';
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
                 {brushedDataBuckets.map(d => {
                    const barX = xBandScale(d.timestamp) || 0;
                    const barY = yScale([...d.networkActivity, ...d.fileVersion].length);
                    const barWidth = xBandScale.bandwidth();
                    const barHeight = yMax - barY < 0 ? 0 : (d.count === 0 ? 0 : yMax - barY);
                    const color = '#666666';
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
                    onChange = {(domain: any) => {handleBrushChange(domain); domain ? setBrushed(true) : setBrushed(false);}}
                    onClick = {handleBrushReset}
                    selectedBoxStyle= {selectedBrushStyle}
                    innerRef={brushRef} />
{/*                 <AxisLeft
                    scale={yScale}
                    numTicks={4} /> */}
                <AxisBottom
                    top={yMax}
                    scale={xBandScale} 
                    numTicks={5}
                    tickFormat={bucketAxisTimeFormat}/>
            </Group>
        </svg>
    );
}

export default EventTimeline;