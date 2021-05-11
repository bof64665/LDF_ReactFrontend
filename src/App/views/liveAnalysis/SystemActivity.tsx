import React, { useMemo } from 'react';
import { useTheme } from '@material-ui/core/styles';
import { CityTemperature } from '@visx/mock-data/lib/mocks/cityTemperature';
import { scaleOrdinal, scaleTime } from '@visx/scale';
import { Group } from '@visx/group';
import { max, extent } from 'd3-array';
import { AxisBottom } from '@visx/axis';

type SystemActivityProps = {
    width: number;
    height: number;
    data: CityTemperature[];
}

const margin = {top: 10, left: 40, bottom: 25, right: 25};

const getCityTemperatureDate = (d: CityTemperature) => new Date(d.date);

export default function SystemActivity(props: SystemActivityProps) {
    const theme = useTheme();
    const keys = useMemo(() => ['San Francisco', 'New York', 'Austin'], []);

    //dimensions
    const innerHeight = props.height - margin.top - margin.bottom;
    const xMax = Math.max(props.width - margin.left - margin.right, 0);
    const yMax = Math.max(innerHeight, 0);

    //scales
    const colorScale = useMemo(
        () => scaleOrdinal<string>({
            domain: keys,
            range: [theme.palette.warning.light, theme.palette.secondary.light, theme.palette.success.light],
        }),
        [keys, theme.palette.warning.light, theme.palette.secondary.light, theme.palette.success.light]
    )
    const timeScale = useMemo(
        () => scaleTime<number>({
            range: [0, xMax],
            domain: extent(props.data, getCityTemperatureDate) as [Date, Date],
        }),
        [xMax, props.data]
    );

    return (
        <React.Fragment>
            <svg width={props.width} height={props.height}>
                <Group left={margin.left} top={margin.top}>

                    <AxisBottom
                        top={yMax}
                        scale={timeScale} />
                </Group>
            </svg>
        </React.Fragment>
    );
}
