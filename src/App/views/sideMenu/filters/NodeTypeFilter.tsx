import React from 'react';
import { createStyles, makeStyles, Theme, useTheme } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import { Legend, LegendItem, LegendLabel } from '@visx/legend';
import { scaleOrdinal } from '@visx/scale';
import { hideNodeType } from '../../../../redux/analysisSlice';
import { useAppDispatch, useAppSelector } from '../../../../redux/hooks';


const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        legend: {
            top: 5,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            fontSize: '10px',
            lineHeight: '0.9em',
            color: '#000',
            float: 'left',
        },
        legendTitle: {
            marginBottom: '5px',
        },
    }),
);

const NodeTypeFilter = ({
    shapeSize,
    strokeWidth
}: {
    shapeSize: number,
    strokeWidth: number
}) => {
    const classes = useStyles();
    const theme = useTheme<Theme>();

    const dispatch = useAppDispatch();
    const {
        hiddenNodeTypes,
    } = useAppSelector(state => state.analysisSliceReducer);

    const legendTriangleHeight = Math.sqrt(3) * shapeSize;
    const nodeTypeScale = scaleOrdinal<string, React.FC | React.ReactNode>({
        domain: ['Process', 'Port', 'File', 'EndPoint'],
        range: [
            <path 
                d={`
                    M 1 ${shapeSize + 1}
                    a ${shapeSize / 2} ${shapeSize / 2} 0 1 0 ${shapeSize * 2 } 0
                    a ${shapeSize} ${shapeSize} 0 1 0 ${-shapeSize * 2} 0
                `} fill="#dd59b8" />,
            <path d={`
                    M 1 ${shapeSize} 
                    L ${shapeSize} 1 
                    L ${shapeSize * 2 - 1} ${shapeSize} 
                    L ${shapeSize} ${shapeSize * 2 - 1 } Z
            `} fill="#dd59b8" />,
            <path d={`
                    M 1 ${legendTriangleHeight}
                    L ${shapeSize * 2 - 1} ${legendTriangleHeight}
                    L ${shapeSize} 1 Z
            `} fill="#dd59b8" />,
            <path d={`
                    M 1 1
                    L 1 ${shapeSize * 2}
                    L ${shapeSize * 2} ${shapeSize * 2}
                    L ${shapeSize * 2} 0 Z
            `} fill="#dd59b8" />,
        ],
    });

    return (
    <div className={classes.legend}>
        <Typography variant="caption" color="textSecondary" className={classes.legendTitle}>Node Types</Typography>
        <Legend scale={nodeTypeScale}>
        {labels => (
            <div style={{ display: 'flex', flexDirection: 'column', cursor: 'pointer' }}>
            {labels.map((label, i) => {
                const color = '#000';
                const shape = nodeTypeScale(label.datum);
                const display = hiddenNodeTypes.includes(label.datum);
                return (
                <LegendItem 
                    key={`legend-node-${label.datum}`} 
                    margin='0 0 5px'
                    onClick={() => dispatch(hideNodeType(label.datum)) }
                >
                    <svg width={15} height={15}>
                        {React.isValidElement(shape)
                            ? React.cloneElement(shape as React.ReactElement<{fill: any, stroke: any, strokeWidth: any}>, {
                                fill: display ? theme.palette.text.disabled : theme.palette.secondary.main,
                                stroke: hiddenNodeTypes.includes(label.datum) ? theme.palette.text.disabled : theme.palette.secondary.main,
                                strokeWidth: strokeWidth,
                            })
                            : React.createElement(shape as React.ComponentType<{ fill: string }>, {
                                fill: color,
                            })}
                    </svg>
                    <LegendLabel align="left" style={{
                        color: display ? theme.palette.text.disabled : theme.palette.text.primary,
                        margin: '0 0 0 4px'}}
                    >
                        {label.text}
                    </LegendLabel>
                </LegendItem>
                );
            })}
            </div>
        )}
        </Legend>
    </div>
    );
}

export default NodeTypeFilter;