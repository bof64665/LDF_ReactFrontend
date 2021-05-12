import React from 'react';
import './App.css';
import clsx from 'clsx';
import { createStyles, makeStyles, Theme } from '@material-ui/core/styles';
import Grid from '@material-ui/core/Grid'
import Toolbar from "@material-ui/core/Toolbar";
import Navigation from "./views/navigation/Navigation";
import LiveAnalysis from "./views/liveAnalysis/LiveAnalysis";
import CssBaseline from "@material-ui/core/CssBaseline";
import Quantity from "./views/toolSelection/Quantity";
import ParentSize from '@visx/responsive/lib/components/ParentSizeModern';

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
        }
    }),
);

function App() {
    const classes = useStyles();
    const [selectedMenuIndex, setSelectedMenuIndex] = React.useState<number>(0)

    return (
        <div className={clsx(classes.root)}>
            <CssBaseline />
            <Navigation selectedView={selectedMenuIndex} handleViewChange={setSelectedMenuIndex}/>
            <main className={clsx(classes.content)}>
                <Toolbar />
                <Grid container className={clsx(classes.container)} spacing={3}>
                    <Grid item xs={12}>
                        {selectedMenuIndex === 0 && <ParentSize>{({width, height}) => (<LiveAnalysis width={width} height={height} />)}</ParentSize>}
                        {selectedMenuIndex === 1 && <Quantity />}
                    </Grid>
                </Grid>
            </main>
        </div>
    );
}

export default App;
