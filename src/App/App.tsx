import './App.css';
import clsx from 'clsx';
import { createStyles, makeStyles, Theme } from '@material-ui/core/styles';
import Grid from '@material-ui/core/Grid'
import Toolbar from "@material-ui/core/Toolbar";
import CssBaseline from "@material-ui/core/CssBaseline";
import ParentSize from '@visx/responsive/lib/components/ParentSizeModern';
import Paper from "@material-ui/core/Paper";
import AppBar from "@material-ui/core/AppBar";  
import Typography from '@material-ui/core/Typography';
import { DateTime } from 'luxon';
import EventTimeline from "./views/EventTimeline";
import NetworkChartV3 from "./views/network/NetworkChartV3";
import { useAppSelector } from '../redux/hooks';
import SideMenu from './views/sideMenu/SideMenu';
import DetailsOnDemand from './views/details/DetailsOnDemand';

const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        root: {
            display: 'flex',
        },
        content: {
            flexGrow: 1,
            height: '100%',
            padding: theme.spacing(3),
            paddingTop: theme.spacing(0),
        },
        container: {
            paddingTop: theme.spacing(3),
        },
        appBar: {
            zIndex: theme.zIndex.drawer + 1,
            transition: theme.transitions.create(['width', 'margin'], {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.leavingScreen,
            }),
        },
        card: {
            padding: theme.spacing(1),
            color: theme.palette.text.secondary,
            textAlign: 'center',
        },
        rowTimeline: {
            paddingTop: '1vh',
            height: '17vh'
        },
        rowGraph: {
            height: '69vh',
        },
    }),
);

function App() {
    const {
        brushedStartDateTime,
        brushedEndDateTime
    } = useAppSelector(state => state.analysisSliceReducer);

    const classes = useStyles();

    return (
        <div className={clsx(classes.root)}>
            <CssBaseline />
            <AppBar position="fixed" className={clsx(classes.appBar)}>
                <Toolbar>
                    <Typography variant="h6" noWrap>
                        Visual Decision Support for Live Digital Forensics
                    </Typography>                   
                </Toolbar>
            </AppBar>

            <SideMenu />

            <main className={clsx(classes.content)}>
                <Toolbar />
                <Grid container className={clsx(classes.container)} spacing={3}>
                    <Grid item xs={12}>
                        <Paper variant="outlined" className={clsx(classes.card, classes.rowTimeline)}>
                            <Grid item xs={12}>
                                <Typography style={{fontSize: '0.8rem'}}>
                                    Current selection: {`${DateTime.fromMillis(brushedStartDateTime).toFormat('MMM dd, yyyy - HH:mm:ss')}`} - {`${DateTime.fromMillis(brushedEndDateTime).toFormat('MMM dd, yyyy - HH:mm:ss')}`}
                                </Typography>
                            </Grid>
                            <ParentSize>
                                {({width: visWidth, height: visHeight}) => (
                                    <EventTimeline width={visWidth} height={visHeight} />
                                )}
                            </ParentSize>           
                        </Paper>   
                    </Grid>       
                    <Grid item xs={9}>
                        <Paper className={classes.rowGraph}>
                            <NetworkChartV3 />
                        </Paper>
                    </Grid>

                    <Grid item xs={3}>
                        <DetailsOnDemand />
                    </Grid>
                </Grid>
            </main>
        </div>
    );
}

// App.whyDidYouRender = true;
export default App;
