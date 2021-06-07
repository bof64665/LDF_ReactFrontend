import clsx from 'clsx';
import { createStyles, makeStyles, Theme, useTheme } from '@material-ui/core/styles';
import Divider from '@material-ui/core/Divider';
import Drawer from '@material-ui/core/Drawer';
import Switch from '@material-ui/core/Switch';
import Grid from '@material-ui/core/Grid';
import Toolbar from "@material-ui/core/Toolbar";
import Typography from '@material-ui/core/Typography';
import { useAppDispatch, useAppSelector } from '../../../redux/hooks';
import { enableGrouping } from '../../../redux/analysisSlice';
import SearchParameters from './searchParameters/SearchParameters';
import NodeTypeFilter from './filters/NodeTypeFilter';
import LinkTypeFilter from './filters/LinkTypeFilter';
import FileVersionLinkFilter from './filters/FileVersionLinkFilter';
import ActiveHostsFilter from './filters/ActiveHostsFilter';
import NetworkActivityLinkFilter from './filters/NetworkActivityLinkFilter';

const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        drawer: {
            width: drawerWidth,
            flexShrink: 0
        },
        drawerPaper: {
            width: drawerWidth,
        },
        drawerOpen: {
            width: drawerWidth,
            overflowX: 'hidden',
        },
    }),
);

const drawerWidth = 300;

const legendSettings = {
    nodeRadius: 6,
    strokeWidth: 2,
}

const SideMenu = () => {
    const classes = useStyles();
    const theme = useTheme<Theme>();

    const dispatch = useAppDispatch();
    const {
        groupingEnabled,
        fileVersionLinkData,
        networkActivityLinkData,
        displayedLinks,
        displayedNodes,
    } = useAppSelector(state => state.analysisSliceReducer);

    return (
        <Drawer variant="permanent" className={clsx(classes.drawer, classes.drawerOpen)} classes={{paper: clsx(classes.drawerOpen)}}>
            <Toolbar />
            <SearchParameters />
            <Divider />
            
            {[...displayedLinks, ...displayedNodes].length > 0 &&
                <Grid container spacing={2} style={{marginBottom: '10px', marginTop: '10px'}}>
                    <Grid item xs={1} />
                    <Grid item xs={6}>
                        <Typography variant="overline" color="textSecondary">Legends & Filters</Typography>
                    </Grid>
                    <Grid item xs={4} container component="label" spacing={1} alignItems="center">
                        <Grid item xs={5} style={{padding: 0}}>
                            <Switch
                                size="small"
                                checked={groupingEnabled}
                                onChange={() => dispatch(enableGrouping())}
                                name="goupingEnabled"
                            />
                        </Grid>
                        <Grid item xs={7}>
                            <Typography variant="caption" style={{color: groupingEnabled ? theme.palette.text.primary : theme.palette.text.disabled}}>Grouping</Typography>
                        </Grid>
                    </Grid>
                    <Grid item xs={1} />

                    <Grid item xs={1} />                    
                    {displayedNodes.length > 0 && <Grid item xs={5}><NodeTypeFilter shapeSize={legendSettings.nodeRadius} strokeWidth={legendSettings.strokeWidth}/></Grid>}
                    {displayedLinks.length > 0 && <Grid item xs={5}><LinkTypeFilter shapeSize={legendSettings.nodeRadius} strokeWidth={legendSettings.strokeWidth}/></Grid>}
                    <Grid item xs={1} />

                    
                    <Grid item xs={1} />
                    <Grid item xs={10}><Divider /></Grid>
                    <Grid item xs={1} />

                    
                    <Grid item xs={1} />
                    <ActiveHostsFilter shapeSize={legendSettings.nodeRadius} strokeWidth={legendSettings.strokeWidth} />
                    <Grid item xs={1} />

                    
                    <Grid item xs={1} />
                    <Grid item xs={10}><Divider /></Grid>
                    <Grid item xs={1} />

                    <Grid item xs={1} />
                    {fileVersionLinkData.length > 0 &&  <Grid item xs={5}><FileVersionLinkFilter shapeSize={legendSettings.nodeRadius} strokeWidth={legendSettings.strokeWidth}/></Grid>}
                    {networkActivityLinkData.length > 0 && <Grid item xs={5}><NetworkActivityLinkFilter shapeSize={legendSettings.nodeRadius} strokeWidth={legendSettings.strokeWidth}/></Grid>}                                
                    <Grid item xs={1} />
                </Grid>
            }          
        </Drawer>
    );
}

export default SideMenu;