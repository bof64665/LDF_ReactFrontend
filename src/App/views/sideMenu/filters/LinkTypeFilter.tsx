import React from 'react';
import { createStyles, makeStyles, Theme, useTheme } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import { Legend, LegendItem, LegendLabel } from '@visx/legend';
import { scaleOrdinal } from '@visx/scale';
import { hideLinkType } from '../../../../redux/analysisSlice';
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

const LinkTypeFilter = ({
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
        hiddenLinkTypes,
    } = useAppSelector(state => state.analysisSliceReducer);

    const linkTypeScale = scaleOrdinal<string, React.FC | React.ReactNode>({
        domain: ['NetworkActivity', 'FileVersion'],
        range: [
            <path 
                d={`M 0 0 l ${shapeSize * 2} ${shapeSize * 2}`}
                strokeWidth='3'
            />,
            <path 
                d={`M 0 0 l ${shapeSize * 2} ${shapeSize * 2}`}
                strokeDasharray='5 3' strokeWidth='3'
            />
        ]
    });

    return (
        <div className={classes.legend}>
        <Typography variant="caption" color="textSecondary" className={classes.legendTitle}>Link Types</Typography>
        <Legend scale={linkTypeScale}>
        {labels => (
            <div style={{ display: 'flex', flexDirection: 'column', cursor: 'pointer' }}>
            {labels.map((label, i) => {
                const color = '#000';
                const shape = linkTypeScale(label.datum);
                const display = hiddenLinkTypes.includes(label.datum);
                return (
                <LegendItem 
                    key={`legend-link-${label.datum}`} 
                    margin='0 0 5px'
                    onClick={() => dispatch(hideLinkType(label.datum)) }
                >
                    <svg width={15} height={15}>
                        {React.isValidElement(shape)
                            ? React.cloneElement(shape as React.ReactElement<{fill: any, stroke: any, strokeWidth: any}>, {
                                stroke: display ? theme.palette.text.disabled : theme.palette.secondary.main,
                            })
                            : React.createElement(shape as React.ComponentType<{ fill: string }>, {
                                fill: color,
                            })}
                    </svg>
                    <LegendLabel style={{
                        margin: '0 0 0 4px', 
                        color: display ? theme.palette.text.disabled : theme.palette.text.primary}}
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

export default LinkTypeFilter;