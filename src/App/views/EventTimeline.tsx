import {useEffect, useMemo, useRef, useState} from 'react';
import { useTheme } from '@material-ui/core/styles';
import { scaleTime, scaleLinear, scaleBand } from '@visx/scale';
import {AxisBottom, AxisLeft} from '@visx/axis';
import { Brush } from '@visx/brush';
import { Group } from '@visx/group';
import { Bar} from "@visx/shape";
import { Bounds } from '@visx/brush/lib/types';
import BaseBrush from '@visx/brush/lib/BaseBrush';
import { max } from 'd3-array';
import { timeFormat } from 'd3';
import { DateTime } from 'luxon';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { setBrushBoundaries } from '../../redux/analysisSlice';
import { FileVersion } from '../models/FileVersion';
import { NetworkActivity } from '../models/NetworkActivity';

const margin = {top: 8, left: 30, bottom: 19, right: 10};
const selectedBrushStyle = { fill: '#919191', opacity: 0.5, stroke: 'white' };

const EventTimeline = ({
    width,
    height,
}: {
    width: number,
    height: number,
}) => {
    const theme = useTheme();

    const dispatch = useAppDispatch();
    const {
        aggregationGranularity,
        startDateTime,
        endDateTime,
        rawFileVersionData,
        rawNetworkActivityData
    } = useAppSelector(state => state.analysisSliceReducer);

    const brushRef = useRef<BaseBrush | null>(null);
    const [brushed, setBrushed] = useState<boolean>(false);
    const [dataBucketsMap, setDataBucketsMap] = useState<Map<number, any>>(new Map());
    const [brushedDataBucketsMap, setBrushedDataBucketsMap] = useState<Map<number, any>>(new Map());

    //dimensions
    const innerHeight = height - margin.top - margin.bottom;
    const chartHeight = innerHeight - margin.bottom;

    //bounds
    const xMax = Math.max(width - margin.left - margin.right, 0);
    const yMax = Math.max(chartHeight, 0);

    const dataBuckets = useMemo(() => Array.from(dataBucketsMap).map((d: any) => d[1]), [dataBucketsMap]);
    const brushedDataBuckets = useMemo(() => Array.from(brushedDataBucketsMap).map((d: any) => d[1]), [brushedDataBucketsMap]);

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
        return timeFormat(`${startDateTime.toFormat('dd.LL, HH:mm:ss')} - ${endDateTime.toFormat('dd.LL, HH:mm:ss')}`);
    }

    useEffect(() => {
        if (!rawFileVersionData || !rawNetworkActivityData) return;
        const buckets = new Map();
        let bucketStartTime = DateTime.fromMillis(startDateTime);
        while(bucketStartTime < DateTime.fromMillis(endDateTime)) {
            const bucket = {timestamp: bucketStartTime.toMillis(), count: 0};
            buckets.set(Math.floor(bucketStartTime.toMillis() / aggregationGranularity), bucket);
            bucketStartTime = bucketStartTime.plus(aggregationGranularity);
        }

        [...rawFileVersionData, ...rawNetworkActivityData].forEach((activity: any) => {
            const versionBinTimestamp = Math.floor(activity.timestamp / aggregationGranularity);
            const bin = buckets.get(versionBinTimestamp);
            if(!bin) return;
            bin.count++;
            buckets.set(versionBinTimestamp, bin)
        });

        setDataBucketsMap(buckets);
    }, [aggregationGranularity, endDateTime, startDateTime, rawFileVersionData, rawNetworkActivityData]);


    const handleBrushChange = (domain: Bounds | null) => {
        if (!domain) return;
        const { x0, x1 } = domain;

        // identify all buckets that are within current brushed borders
        const tempBrushedDataBuckets = new Map();
        dataBucketsMap.forEach((dataBucket, key) => {
            if(dataBucket.timestamp > x0 && dataBucket.timestamp < x1) tempBrushedDataBuckets.set(key, {timestamp: dataBucket.timestamp, count: 0});
        });

        // identify all activities that are within current brushed borders
        // and add them to the respective data bucket from above
        [...rawFileVersionData, ...rawNetworkActivityData].forEach((activity: FileVersion | NetworkActivity) => {
            if(activity.timestamp > x0 && activity.timestamp < x1) {
                const versionBinTimestamp = Math.floor(activity.timestamp / aggregationGranularity);
                const bin = tempBrushedDataBuckets.get(versionBinTimestamp);
                if(!bin) return;
                bin.count++;
                tempBrushedDataBuckets.set(versionBinTimestamp, bin);
            }
        });
        setBrushedDataBucketsMap(tempBrushedDataBuckets);
        dispatch(setBrushBoundaries({startTimestamp: x0, endTimeStamp: x1}));
    };

    const handleBrushReset = () => {
        if(brushRef?.current) brushRef.current.reset();
        setBrushed(false);
        dispatch(setBrushBoundaries({startTimestamp: startDateTime, endTimeStamp: endDateTime}));
        setBrushedDataBucketsMap(new Map());
    }

    //HTML
    return (
        <svg width={width} height={height}>
            <Group left={margin.left} top={margin.top}>
                {dataBuckets.map(d => {
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
                 {brushedDataBuckets.map(d => {
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
                    onChange = {(domain: any) => {handleBrushChange(domain); domain ? setBrushed(true) : setBrushed(false);}}
                    onClick = {handleBrushReset}
                    selectedBoxStyle= {selectedBrushStyle}
                    innerRef={brushRef} />
                <AxisLeft
                    scale={yScale}
                    numTicks={4} />
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