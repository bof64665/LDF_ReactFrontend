import React, { useMemo } from 'react';
import { createStyles, makeStyles, Theme, useTheme } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import Grid from '@material-ui/core/Grid';
import { LegendOrdinal, LegendItem, LegendLabel } from '@visx/legend';
import { scaleOrdinal } from '@visx/scale';
import { schemeTableau10 } from 'd3';
import { hideHost } from '../../../../redux/analysisSlice';
import { useAppDispatch, useAppSelector } from '../../../../redux/hooks';


const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        legend: {
            top: 5,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            fontSize: '12px',
            lineHeight: '1em',
            color: '#000',
            float: 'left',
        },
        legendTitle: {
            marginBottom: '5px',
        },
    }),
);

const ActiveHostsFilter = ({
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
        hiddenHosts,
        activeHosts
    } = useAppSelector(state => state.analysisSliceReducer);

    const hostColorScale = useMemo(() => 
    scaleOrdinal({
        range: [...schemeTableau10],
        domain: activeHosts}), [activeHosts]);

    return (
        <React.Fragment>
            <Grid item xs={5}>
                <div className={classes.legend}>
                    <Typography variant="caption" color="textSecondary" className={classes.legendTitle}>Hosts</Typography>
                    <LegendOrdinal scale={hostColorScale} labelFormat={(label: any) => `${label.toUpperCase()}`}>
                        {labels => (
                            <div style={{display: 'flex', flexDirection: 'column', cursor: 'pointer'}}>
                                {labels.map((label, i) => {
                                    const display = hiddenHosts.includes(label.datum as string);
                                    if (i % 2 === 1 ) return <div />;
                                    return (
                                        <LegendItem
                                            key={`legend-host-${i}`}
                                            margin='0 0 5px'
                                            onClick={() => dispatch(hideHost(label.datum as string)) }
                                        >
                                            <svg width='15' height='15'>
                                                <rect 
                                                    fill={ display ? theme.palette.text.disabled : label.value }
                                                    stroke={ display ? theme.palette.text.disabled : label.value }
                                                    strokeWidth='1.5'
                                                    width='13' 
                                                    height='13' x='1' y='1' />
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
                    </LegendOrdinal>
                </div>
            </Grid>
            <Grid item xs={5}>
                <div className={classes.legend}>
                    <LegendOrdinal scale={hostColorScale} labelFormat={(label: any) => `${label.toUpperCase()}`}>
                        {labels => (
                            <div style={{display: 'flex', flexDirection: 'column', cursor: 'pointer', marginTop: '22.5px'}}>
                            {labels.map((label, i) => {
                                const display = hiddenHosts.includes(label.datum as string);
                                if (i % 2 === 0 ) return <div />;
                                return (
                                    <LegendItem
                                        key={`legend-host-${i}`}
                                        margin='0 0 5px'
                                        onClick={() => dispatch(hideHost(label.datum as string)) }
                                    >
                                        <svg width='15' height='15'>
                                            <rect 
                                                fill={ display ? theme.palette.text.disabled : label.value }
                                                stroke={ display ? theme.palette.text.disabled : label.value }
                                                strokeWidth='1.5'
                                                width='13' 
                                                height='13' x='1' y='1' />
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
                    </LegendOrdinal>
                </div>
            </Grid>
        </React.Fragment>
    );
}

export default ActiveHostsFilter;