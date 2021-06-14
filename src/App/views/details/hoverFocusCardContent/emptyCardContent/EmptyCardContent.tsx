import Grid from '@material-ui/core/Grid'
import CardContent from '@material-ui/core/CardContent';
import Typography from '@material-ui/core/Typography';
import ParentSize from '@visx/responsive/lib/components/ParentSizeModern';
import EndpointScatter from './EndpointScatter';
import FileScatter from './FileScatter';
import ActivityLines from './ActivityLines';

const EmptyCardContent = () => {
    return (
        <CardContent>
            <Grid container spacing={1}>
                <Grid item xs={12} style={{height: '20vh'}}>
                    <Typography variant="overline">System Activity</Typography>
                    <ParentSize>
                        {({width, height}) => <ActivityLines width={width} height={height}/>}
                    </ParentSize>
                </Grid>
                <Grid item xs={12} style={{height: '20vh'}}>
                    <Typography variant="overline">Network Activity</Typography>
                    <ParentSize>
                        {({width, height}) => <EndpointScatter width={width} height={height}/>}
                    </ParentSize>
                </Grid>
                <Grid item xs={12} style={{height: '20vh'}}>
                    <Typography variant="overline">File Versions</Typography>
                    <ParentSize>
                        {({width, height}) => <FileScatter width={width} height={height}/>}
                    </ParentSize>
                </Grid>
            </Grid>
            
            
        </CardContent>
    )
};

export default EmptyCardContent;