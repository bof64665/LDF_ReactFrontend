import { useMemo } from 'react';
import { createStyles, makeStyles, Theme, useTheme } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import { LegendQuantile, LegendItem, LegendLabel } from '@visx/legend';
import { scaleQuantile } from '@visx/scale';
import { format } from 'd3-format';
import { hideNetworkActivityLink } from '../../../../redux/analysisSlice';
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

const twoDecimalFormat = format('.2f');

const NetworkActivityLinkFilter = ({
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
        hiddenNetworkActivityLinks,
        networkActivityLinkData
    } = useAppSelector(state => state.analysisSliceReducer);

    const networkActivityColorScale = useMemo(() => {
        const proportions = networkActivityLinkData.map((link: any) => link.byteProportion)
        return scaleQuantile({
            domain: [Math.min(...proportions), Math.max(...proportions)],
            range: ['#9096f8', '#78f6ef', '#6ce18b', '#f19938', '#eb4d70']
        });
    }, [networkActivityLinkData]);

    return (
    <div className={classes.legend}>
        <Typography variant="caption" color="textSecondary" className={classes.legendTitle}>NetworkActivity</Typography>
        <LegendQuantile scale={networkActivityColorScale} labelFormat={(d, i) => twoDecimalFormat(d)}>
            {labels => (
                <div style={{ display: 'flex', flexDirection: 'column', cursor: 'pointer' }}>
                    {labels.map((label, i) => {
                        const display = hiddenNetworkActivityLinks.includes(label.value);
                        return (
                        <LegendItem
                            key={`legend-file-version-${i}`}
                            margin='0 0 5px'
                            onClick={() => dispatch(hideNetworkActivityLink(label.value)) }
                        >
                            <svg width={shapeSize * 2 + 1.5} height={shapeSize * 2 + 1.5} style={{ margin: '2px 0' }}>
                                <circle
                                    fill={ display ? theme.palette.text.disabled : label.value }
                                    stroke={ display ? theme.palette.text.disabled : label.value }
                                    strokeWidth='1.5'
                                    r={shapeSize}
                                    cx={shapeSize + 0.75}
                                    cy={shapeSize + 0.75}
                                />
                            </svg>
                            <LegendLabel style={{
                                    margin: '0 0 0 4px', 
                                    color: display ? theme.palette.text.disabled : theme.palette.text.primary}}
                                >
                                    {label.text}
                                </LegendLabel>
                        </LegendItem>
                    )})}
                </div>
            )}
        </LegendQuantile>
    </div>
    );
}

export default NetworkActivityLinkFilter;