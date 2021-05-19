import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './App.css';
import clsx from 'clsx';
import { createStyles, makeStyles, Theme, useTheme } from '@material-ui/core/styles';
import Grid from '@material-ui/core/Grid'
import Toolbar from "@material-ui/core/Toolbar";
import CssBaseline from "@material-ui/core/CssBaseline";
import ParentSize from '@visx/responsive/lib/components/ParentSizeModern';
import Paper from "@material-ui/core/Paper";
import AppBar from "@material-ui/core/AppBar";  
import Typography from '@material-ui/core/Typography';
import Divider from '@material-ui/core/Divider';
import Drawer from '@material-ui/core/Drawer';
import Button from "@material-ui/core/Button";
import ButtonGroup from "@material-ui/core/ButtonGroup";
import Switch from '@material-ui/core/Switch';
import { DateTimePicker } from '@material-ui/pickers';
import { DateTime } from 'luxon';
import { gql, useLazyQuery, useQuery } from '@apollo/client';
import { scaleOrdinal, scaleQuantile } from '@visx/scale';
import { Bounds } from '@visx/brush/lib/types';
import { Legend, LegendItem, LegendLabel, LegendOrdinal, LegendQuantile } from '@visx/legend';
import { cloneDeep } from 'lodash';
import { Port } from './models/Port';
import { Process } from './models/Process';
import { File } from './models/File';
import { Endpoint } from './models/Endpoint';
import { NetworkActivity } from './models/NetworkActivity';
import { FileVersion } from './models/FileVersion';
import EventTimeline from "./views/EventTimeline";
import NetworkChart from "./views/NetworkChart";
import { timeFormat } from 'd3';
import { schemeTableau10 } from 'd3';
import { format } from 'd3-format';

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

const twoDecimalFormat = format('.2f');

const drawerWidth = 300;

const GET_AVAILABLE_DATA_RANGE = gql`
    query GetDataAvailability {
        dataAvailability {
            startTime
            endTime
        }
    }
`;

const GET_ANALYSIS_DATA = gql`
    query getAnalysisData ($start: Float, $end: Float) {
        analysisData (startTime: $start, endTime: $end) {
            ports {id portNumber hostName processes}
            endpoints {id hostName hostIp}
            processes {id name hostName}
            files {id path name type hostName}
            fileVersions {id timestamp target source fileSize action}
            networkActivities {id timestamp target source process protocol length}
        }
    }
`;

const legendSettings = {
    nodeRadius: 6,
    strokeWidth: 2,
}
const legendTriangleHeight = Math.sqrt(3) * legendSettings.nodeRadius;

const nodeTypeScale = scaleOrdinal<string, React.FC | React.ReactNode>({
    domain: ['Process', 'Port', 'File', 'EndPoint'],
    range: [
        <path 
            d={`
                M 1 ${legendSettings.nodeRadius + 1}
                a ${legendSettings.nodeRadius / 2} ${legendSettings.nodeRadius / 2} 0 1 0 ${legendSettings.nodeRadius * 2 } 0
                a ${legendSettings.nodeRadius} ${legendSettings.nodeRadius} 0 1 0 ${-legendSettings.nodeRadius * 2} 0
            `} fill="#dd59b8" />,
        <path d={`
                M 1 ${legendSettings.nodeRadius} 
                L ${legendSettings.nodeRadius} 1 
                L ${legendSettings.nodeRadius * 2 - 1} ${legendSettings.nodeRadius} 
                L ${legendSettings.nodeRadius} ${legendSettings.nodeRadius * 2 - 1 } Z
        `} fill="#dd59b8" />,
        <path d={`
                M 1 ${legendTriangleHeight}
                L ${legendSettings.nodeRadius * 2 - 1} ${legendTriangleHeight}
                L ${legendSettings.nodeRadius} 1 Z
        `} fill="#dd59b8" />,
        <path d={`
                M 1 1
                L 1 ${legendSettings.nodeRadius * 2}
                L ${legendSettings.nodeRadius * 2} ${legendSettings.nodeRadius * 2}
                L ${legendSettings.nodeRadius * 2} 0 Z
        `} fill="#dd59b8" />,
    ],
});

const linkTypeScale = scaleOrdinal<string, React.FC | React.ReactNode>({
    domain: ['PortLink', 'FileVersion', 'NetworkActivity'],
    range: [
        <path 
            d={`M 0 0 l ${legendSettings.nodeRadius * 2} ${legendSettings.nodeRadius * 2}`}
            strokeDasharray='2 1' strokeWidth='3'
        />,
        <path 
            d={`M 0 0 l ${legendSettings.nodeRadius * 2} ${legendSettings.nodeRadius * 2}`}
            strokeWidth='3'
        />,
        <path 
            d={`M 0 0 l ${legendSettings.nodeRadius * 2} ${legendSettings.nodeRadius * 2}`}
            strokeDasharray='5 3' strokeWidth='3'
        />
    ]
})

function App() {
    const classes = useStyles();
    const theme = useTheme<Theme>();

    /* State variables for search */
    const [maxDateTime, setMaxDateTime] = useState<DateTime>(DateTime.now());
    const [minDateTime, setMinDateTime] = useState<DateTime>(maxDateTime.minus({days: 1}));
    const [startDateTime, setStartDateTime] = useState<DateTime>(minDateTime);
    const [endDateTime, setEndDateTime] = useState<DateTime>(maxDateTime);
    const [dateSelectionErr, setDateSelectionErr] = useState<boolean>(false);
    const [aggregationGranularity, setAggregationGranularity] = useState<number>(60000);

    /* State variables for raw data */
    const [ports, setPorts] = useState<Port[]>([]);
    const [processes, setProcesses] = useState<Process[]>([]);
    const [files, setFiles] = useState<File[]>([]);
    const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
    const [fileVersions, setFileVersions] = useState<FileVersion[]>([]);
    const [networkActivities, setNetworkActivities] = useState<NetworkActivity[]>([]);

    /* State variables for filters */
    const [groupingEnabled, setGroupingEnabled] = useState(false);
    const [hiddenNodeTypes, setHiddenNodeTypes] = useState([]);
    const [hiddenLinkTypes, setHiddenLinkTypes] = useState([]);
    const [hiddenHosts, setHiddenHosts] = useState([]);
    const [hiddenFileVersionLinks, setHiddenFileVersionLinks] = useState([]);
    const [hiddenNetworkActivityLinks, setHiddenNetworkActivityLinks] = useState([]);

    /* State variables for brushing behavior */
    const [brushedStartDateTime, setBrushedStartDateTime] = useState<DateTime>(startDateTime);
    const [brushedEndDateTime, setBrushedEndDateTime] = useState<DateTime>(endDateTime);
    const [brushedDataBuckets, setBrushedDataBuckets] = useState<Map<number, any>>(new Map());

    /* State variables for pre-processed data to display */
    const [displayedPorts, setDisplayedPorts] = useState<Port[]>([]);
    const [displayedProcesses, setDisplayedProcesses] = useState<Process[]>([]);
    const [displayedFiles, setDisplayedFiles] = useState<File[]>([]);
    const [displayedEndpoints, setDisplayedEndpoints] = useState<Endpoint[]>([]);
    const [displayedPortLinks, setDisplayedPortLinks] = useState<{id: string, target: Port, source: Process | Endpoint}[]>([]);
    const [displayedFileVersionLinks, setDisplayedFileVersionLinks] = useState<any[]>([]);
    const [displayedNetworkActivityLinks, setDisplayedNetworkActivityLinks] = useState<any[]>([]);
    const [dataBuckets, setDataBuckets] = useState<Map<number, any>>(new Map());

    /* Custom time format for the event timeline time axiis */
    const bucketAxisTimeFormat = (date: any) => {
        const startDateTime = DateTime.fromMillis(date);
        const endDateTime = startDateTime.plus({milliseconds: aggregationGranularity});
        return timeFormat(`${startDateTime.toFormat('dd.LL, HH:mm:ss')} - ${endDateTime.toFormat('dd.LL, HH:mm:ss')}`)
    }

    /* GraphQL query to get the datetime range for which data is actually available */
    const { 
        loading: loadingAvailableDateRange,
        error: errorAvailableDateRange,
        data: availableDateRange } =  useQuery(GET_AVAILABLE_DATA_RANGE);

    /* Lazy GraphQL query to get the actual data. Lazy means, this query is not performed before its actually triggered. */
    const [
        getAnalysisData, 
        {
            loading: loadingAnalysisData, 
            error: errorAnalysisData, 
            data: analysisData}] = useLazyQuery(GET_ANALYSIS_DATA);

    /* Callback if search button is clicked. Triggers lazy GraphQL query to get the data. */
    const handleSearch = useCallback(
        () => {
            getAnalysisData({variables: {start: startDateTime.toMillis(), end: endDateTime.toMillis()}});
        },
        [getAnalysisData, startDateTime, endDateTime],
    );

    /* A list of all hosts (e.g. IP adresses) that are included in the data set. */
    const hosts = useMemo(() => {
        const types = ['localhost'];
        endpoints.forEach((endpoint: Endpoint) => {
            if(types.indexOf(endpoint.hostName) < 0) types.push(endpoint.hostName); 
        });
        return types;
    }, [endpoints]);

    /* Ordinal color scale with a specific color for each host in the data set. */
    const hostColorScale = useMemo(() => 
        scaleOrdinal({
            range: [...schemeTableau10],
            domain: hosts}), [hosts]);

    /* Quantile color scale for file version links for a specific color for each quantile respective to overall byte proportion. */
    const fileVersionColorScale = useMemo(() => {
        const proportions = displayedFileVersionLinks.map((link: any) => link.byteProportion)
        return scaleQuantile({
            domain: [Math.min(...proportions), Math.max(...proportions)],
            range: ['#9096f8', '#78f6ef', '#6ce18b', '#f19938', '#eb4d70']
        });
    }, [displayedFileVersionLinks]);

    /* Quantile color scale for network activity links for a specific color for each quantile respective to overall byte proportion. */
    const networkActivityColorScale = useMemo(() => {
        const proportions = displayedNetworkActivityLinks.map((link: any) => link.byteProportion)
        return scaleQuantile({
            domain: [Math.min(...proportions), Math.max(...proportions)],
            range: ['#9096f8', '#78f6ef', '#6ce18b', '#f19938', '#eb4d70']
        });
    }, [displayedNetworkActivityLinks]);
        
    /* Set minimum and maximum selectable datetime depending on the available date range in the backend. */
    useEffect(() => {
        if(!availableDateRange || loadingAvailableDateRange || errorAvailableDateRange) return;
        setMinDateTime(DateTime.fromMillis(availableDateRange.dataAvailability.startTime));
        setMaxDateTime(DateTime.fromMillis(availableDateRange.dataAvailability.endTime));
    }, [loadingAvailableDateRange, errorAvailableDateRange, availableDateRange]);

    /* Initially set the selected start and end time for data analysis.  */
    useEffect(() => {
        setDateSelectionErr(false);
        setStartDateTime(minDateTime);
        setEndDateTime(maxDateTime);
    }, [minDateTime, maxDateTime]);

    /* when analysis data from the backend is retrieved, deep copy the data into the respective state variables */
    useEffect(() => {
        if(!analysisData || loadingAnalysisData || errorAnalysisData) return;
        setPorts(cloneDeep(analysisData.analysisData.ports));
        setProcesses(cloneDeep(analysisData.analysisData.processes));
        setFiles(cloneDeep(analysisData.analysisData.files));
        setEndpoints(cloneDeep(analysisData.analysisData.endpoints));
        setFileVersions(cloneDeep(analysisData.analysisData.fileVersions));
        setNetworkActivities(cloneDeep(analysisData.analysisData.networkActivities));
    }, [analysisData, loadingAnalysisData, errorAnalysisData]);

    /* Reset the time range that might be brushed when a new selection of a analysis time range is made.  */
    useEffect(() => {
        setBrushedStartDateTime(startDateTime);
        setBrushedEndDateTime(endDateTime);
    }, [startDateTime, endDateTime]);

    useEffect(() => {
        if (!fileVersions || !networkActivities) return;
        const buckets = new Map();
        let bucketStartTime = DateTime.fromMillis(startDateTime.toMillis());
        while(bucketStartTime < DateTime.fromMillis(endDateTime.toMillis())) {
            const bucket = {timestamp: bucketStartTime.toMillis(), count: 0};
            buckets.set(Math.floor(bucketStartTime.toMillis() / aggregationGranularity), bucket);
            bucketStartTime = bucketStartTime.plus(aggregationGranularity);
        }

        [...fileVersions, ...networkActivities].forEach((activity: any) => {
            const versionBinTimestamp = Math.floor(activity.timestamp / aggregationGranularity);
            const bin = buckets.get(versionBinTimestamp);
            if(!bin) return;
            bin.count++;
            buckets.set(versionBinTimestamp, bin)
        });

        setDataBuckets(buckets);
    }, [aggregationGranularity, endDateTime, startDateTime, fileVersions, networkActivities]);

    useEffect(() => {
        setDisplayedPortLinks(getPortLinkDataArray(displayedPorts, endpoints, processes));
    }, [endpoints, displayedPorts, processes]);

    useEffect(() => {
        setDisplayedFileVersionLinks(
            Array
                .from(getLinkDataMap(fileVersions, 'FileVersion', processes, files, brushedStartDateTime, brushedEndDateTime))
                .map((d: any) => d[1]));
    }, [brushedEndDateTime, brushedStartDateTime, fileVersions, files, processes]);

    useEffect(() => {
        setDisplayedNetworkActivityLinks(
            Array
                .from(getLinkDataMap(networkActivities, 'NetworkActivity', ports, ports, brushedStartDateTime, brushedEndDateTime))
                .map((d: any) => d[1]));
    }, [brushedEndDateTime, brushedStartDateTime, ports, networkActivities]);

    useEffect(() => {
        const displayedNodeIds = [];
        [...displayedPortLinks, ...displayedFileVersionLinks].forEach((link: any) => {
            displayedNodeIds.push(link.target.id);
            displayedNodeIds.push(link.source.id);
        });
        setDisplayedProcesses(processes.filter((process: Process) => displayedNodeIds.includes(process.id)));
        setDisplayedEndpoints(endpoints.filter((endpoint: Endpoint) => displayedNodeIds.includes(endpoint.id)));
    }, [displayedFileVersionLinks, displayedPortLinks, endpoints, processes])

    useEffect(() => {
        const displayedNodeIds = [];
        [...displayedFileVersionLinks, ...displayedNetworkActivityLinks].forEach((link: any) => {
            displayedNodeIds.push(link.target.id);
            displayedNodeIds.push(link.source.id);
        });
        setDisplayedFiles(files.filter((file: File) => displayedNodeIds.includes(file.id)));
        setDisplayedPorts(ports.filter((port: Port) => displayedNodeIds.includes(port.id)));
    }, [displayedFileVersionLinks, displayedNetworkActivityLinks, files, ports]);

    const handleBrushChange = (domain: Bounds | null) => {
        if (!domain) return;
        const { x0, x1 } = domain;

        // identify all buckets that are within current brushed borders
        const tempBrushedDataBuckets = new Map();
        dataBuckets.forEach((dataBucket, key) => {
            if(dataBucket.timestamp > x0 && dataBucket.timestamp < x1) tempBrushedDataBuckets.set(key, {timestamp: dataBucket.timestamp, count: 0});
        });

        // identify all activities that are within current brushed borders
        // and add them to the respective data bucket from above
        [...fileVersions, ...networkActivities].forEach((activity: FileVersion | NetworkActivity) => {
            if(activity.timestamp > x0 && activity.timestamp < x1) {
                const versionBinTimestamp = Math.floor(activity.timestamp / aggregationGranularity);
                const bin = tempBrushedDataBuckets.get(versionBinTimestamp);
                if(!bin) return;
                bin.count++;
                tempBrushedDataBuckets.set(versionBinTimestamp, bin);
            }
        });
        setBrushedDataBuckets(tempBrushedDataBuckets);
        setBrushedStartDateTime(DateTime.fromMillis(x0));
        setBrushedEndDateTime(DateTime.fromMillis(x1));
    };

    const handleBrushReset = () => {
        setBrushedStartDateTime(startDateTime);
        setBrushedEndDateTime(endDateTime);
        setBrushedDataBuckets(new Map());
    }

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
            <Drawer
                variant="permanent"
                className={clsx(classes.drawer, classes.drawerOpen)}
                classes={{paper: clsx(classes.drawerOpen)}}>
                <Toolbar />
                <Grid container spacing={3} style={{marginBottom: '10px', marginTop: '10px'}}>
                    <Grid item xs={1} />
                    <Grid item xs={10}>
                        <Typography variant="overline" color="textSecondary">Search Parameters</Typography>
                    </Grid>
                    <Grid item xs={1} />

                    <Grid item xs={1} />
                    <Grid item xs={10}>
                        <DateTimePicker 
                            label="Start" 
                            inputVariant="standard"
                            variant="inline"
                            style={{ width: '100%' }}
                            ampm={false}
                            disableFuture={true}
                            format="MMM dd, yyyy - HH:mm"
                            strictCompareDates={true}
                            minDate={minDateTime}
                            minDateMessage={`No data before ${minDateTime.toFormat('MMM dd, yyyy - HH:mm')}`}
                            maxDate={endDateTime}
                            maxDateMessage={`Needs to be before ${endDateTime.toFormat('MMM dd, yyyy - HH:mm')}`}
                            value={startDateTime} 
                            onChange={(date: DateTime) => {
                                setStartDateTime(date);
                                setDateSelectionErr((date >= minDateTime && date <= endDateTime) ? false : true);
                            }}
                        />
                    </Grid>
                    <Grid item xs={1} />

                    <Grid item xs={1} />
                    <Grid item xs={10}>
                        <DateTimePicker 
                            label="End" 
                            inputVariant="standard"
                            variant="inline"
                            style={{ width: '100%' }}
                            ampm={false}
                            disableFuture={true}
                            format="MMM dd, yyyy - HH:mm"
                            strictCompareDates={true}
                            minDate={startDateTime}
                            minDateMessage={`Needs to be after ${startDateTime.toFormat('MMM dd, yyyy - HH:mm')}`}
                            maxDate={maxDateTime}
                            maxDateMessage={`No data after ${maxDateTime.toFormat('MMM dd, yyyy - HH:mm')}`}
                            value={endDateTime} 
                            onChange={(date: DateTime) => {
                                setEndDateTime(date);
                                setDateSelectionErr((date <= maxDateTime && date >= startDateTime) ? false : true);
                            }}
                        />
                    </Grid>
                    <Grid item xs={1} />

                    <Grid item xs={1} />
                    <Grid item xs={10} >
                        <ButtonGroup size="large" style={{ width: '100%', marginTop: '5px' }}>
                            <Button color={aggregationGranularity === 1000 ? "secondary" : "default"} variant="contained" onClick={() => setAggregationGranularity(1000)}>1s</Button>
                            <Button color={aggregationGranularity === 60000 ? "secondary" : "default"} variant="contained" onClick={() => setAggregationGranularity(60000)}>1m</Button>
                            <Button color={aggregationGranularity === 3600000 ? "secondary" : "default"} variant="contained" onClick={() => setAggregationGranularity(3600000)}>1h</Button>
                            <Button color={aggregationGranularity === 43200000 ? "secondary" : "default"} variant="contained" onClick={() => setAggregationGranularity(43200000)}>12h</Button>
                            <Button color={aggregationGranularity === 86400000 ? "secondary" : "default"} variant="contained" onClick={() => setAggregationGranularity(86400000)}>24h</Button>
                        </ButtonGroup>
                    </Grid>
                    <Grid item xs={1} />

                    <Grid item xs={1} />
                    <Grid item xs={10} >
                        <Button 
                            variant="contained" 
                            color="secondary" 
                            disabled={dateSelectionErr}
                            size="large"
                            onClick={handleSearch} 
                            style={{ width: '100%', marginTop: '1.5%' }}>
                                Search
                        </Button>
                    </Grid>
                    <Grid item xs={1} />
                </Grid>
                <Divider />
                {[...files, ...ports, ...processes, ...endpoints].length > 0 &&
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
                                    onChange={() => setGroupingEnabled(prev => !prev)}
                                    name="goupingEnabled"
                                />
                            </Grid>
                            <Grid item xs={7}>
                                <Typography variant="caption" style={{color: groupingEnabled ? theme.palette.text.primary : theme.palette.text.disabled}}>Grouping</Typography>
                            </Grid>
                        </Grid>
                        <Grid item xs={1} />

                        <Grid item xs={1} />
                        <Grid item xs={5}>
                            <div className={clsx(classes.legend)}>
                                <Typography variant="caption" color="textSecondary" className={clsx(classes.legendTitle)}>Node Types</Typography>
                                <Legend scale={nodeTypeScale}>
                                {labels => (
                                    <div style={{ display: 'flex', flexDirection: 'column', cursor: 'pointer' }}>
                                    {labels.map((label, i) => {
                                        const color = '#000';
                                        const shape = nodeTypeScale(label.datum);
                                        const display = hiddenNodeTypes.includes(label.datum);
                                        return (
                                        <LegendItem 
                                            key={`legend-node-${i}`} 
                                            margin='0 0 5px'
                                            onClick={() => {
                                                setHiddenNodeTypes(prevNodeTypes => prevNodeTypes.includes(label.datum) ? prevNodeTypes.filter(nodeType => nodeType !== label.datum) : [...prevNodeTypes, label.datum])
                                            }}
                                        >
                                            <svg width={15} height={15}>
                                                {React.isValidElement(shape)
                                                    ? React.cloneElement(shape as React.ReactElement<{fill: any, stroke: any, strokeWidth: any}>, {
                                                        fill: display ? theme.palette.text.disabled : theme.palette.secondary.main,
                                                        stroke: hiddenNodeTypes.includes(label.datum) ? theme.palette.text.disabled : theme.palette.secondary.main,
                                                        strokeWidth: legendSettings.strokeWidth,
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
                        </Grid>
                        <Grid item xs={5}>
                            <div className={clsx(classes.legend)}>
                                <Typography variant="caption" color="textSecondary" className={clsx(classes.legendTitle)}>Link Types</Typography>
                                <Legend scale={linkTypeScale}>
                                {labels => (
                                    <div style={{ display: 'flex', flexDirection: 'column', cursor: 'pointer' }}>
                                    {labels.map((label, i) => {
                                        const color = '#000';
                                        const shape = linkTypeScale(label.datum);
                                        const display = hiddenLinkTypes.includes(label.datum);
                                        return (
                                        <LegendItem 
                                            key={`legend-node-${i}`} 
                                            margin='0 0 5px'
                                            onClick={() => {
                                                setHiddenLinkTypes(prevNodeTypes => prevNodeTypes.includes(label.datum) ? prevNodeTypes.filter(nodeType => nodeType !== label.datum) : [...prevNodeTypes, label.datum])
                                            }}
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
                        </Grid>
                        <Grid item xs={1} />

                        {/* DIVIDER */}
                        <Grid item xs={1} />
                        <Grid item xs={10}>
                            <Divider />
                        </Grid>
                        <Grid item xs={1} />

                        <Grid item xs={1} />
                        <Grid item xs={5}>
                            <div className={clsx(classes.legend)}>
                                <Typography variant="caption" color="textSecondary" className={clsx(classes.legendTitle)}>Hosts</Typography>
                                <LegendOrdinal scale={hostColorScale} labelFormat={(label: any) => `${label.toUpperCase()}`}>
                                    {labels => (
                                        <div style={{display: 'flex', flexDirection: 'column', cursor: 'pointer'}}>
                                            {labels.map((label, i) => {
                                                const display = hiddenHosts.includes(label.datum);
                                                if (i % 2 === 1 ) return <div />;
                                                return (
                                                    <LegendItem
                                                        key={`legend-host-${i}`}
                                                        margin='0 0 5px'
                                                        onClick={() => {
                                                            setHiddenHosts(prevHosts => prevHosts.includes(label.datum) ? prevHosts.filter(host => host !== label.datum) : [...prevHosts, label.datum])
                                                        }}
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
                            <div className={clsx(classes.legend)}>
                                <LegendOrdinal scale={hostColorScale} labelFormat={(label: any) => `${label.toUpperCase()}`}>
                                    {labels => (
                                        <div style={{display: 'flex', flexDirection: 'column', cursor: 'pointer', marginTop: '22.5px'}}>
                                        {labels.map((label, i) => {
                                            const display = hiddenHosts.includes(label.datum);
                                            if (i % 2 === 0 ) return <div />;
                                            return (
                                                <LegendItem
                                                    key={`legend-host-${i}`}
                                                    margin='0 0 5px'
                                                    onClick={() => {
                                                        setHiddenHosts(prevHosts => prevHosts.includes(label.datum) ? prevHosts.filter(host => host !== label.datum) : [...prevHosts, label.datum])
                                                    }}
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
                        <Grid item xs={1} />

                        {/* DIVIDER */}
                        <Grid item xs={1} />
                        <Grid item xs={10}>
                            <Divider />
                        </Grid>
                        <Grid item xs={1} />

                        <Grid item xs={1} />
                        <Grid item xs={5}>
                            <div className={clsx(classes.legend)}>
                                <Typography variant="caption" color="textSecondary" className={clsx(classes.legendTitle)}>FileVersions</Typography>
                                <LegendQuantile scale={fileVersionColorScale} labelFormat={(d, i) => twoDecimalFormat(d)}>
                                    {labels =>
                                        labels.map((label, i) => {
                                            const display = hiddenFileVersionLinks.includes(label.value);
                                            return (
                                            <LegendItem
                                                key={`legend-${i}`}
                                                margin='0 0 5px'
                                                onClick={() => {
                                                    setHiddenFileVersionLinks(prevLinks => prevLinks.includes(label.value) ? prevLinks.filter(link => link !== label.value) : [...prevLinks, label.value])
                                                }}>
                                                <svg width={legendSettings.nodeRadius * 2 + 1.5} height={legendSettings.nodeRadius * 2 + 1.5} style={{ margin: '2px 0' }}>
                                                    <circle
                                                        fill={ display ? theme.palette.text.disabled : label.value }
                                                        stroke={ display ? theme.palette.text.disabled : label.value }
                                                        strokeWidth='1.5'
                                                        r={legendSettings.nodeRadius}
                                                        cx={legendSettings.nodeRadius + 0.75}
                                                        cy={legendSettings.nodeRadius + 0.75}
                                                    />
                                                </svg>
                                                <LegendLabel style={{
                                                        margin: '0 0 0 4px', 
                                                        color: display ? theme.palette.text.disabled : theme.palette.text.primary}}
                                                    >
                                                        {label.text}
                                                    </LegendLabel>
                                            </LegendItem>
                                        )})
                                    }
                                </LegendQuantile>
                            </div>
                        </Grid>
                        <Grid item xs={5}>
                            <div className={clsx(classes.legend)}>
                                <Typography variant="caption" color="textSecondary" className={clsx(classes.legendTitle)}>NetworkActivity</Typography>
                                <LegendQuantile scale={networkActivityColorScale} labelFormat={(d, i) => twoDecimalFormat(d)}>
                                    {labels =>
                                        labels.map((label, i) => {
                                            const display = hiddenNetworkActivityLinks.includes(label.value);
                                            return (
                                            <LegendItem
                                                key={`legend-${i}`}
                                                margin='0 0 5px'
                                                onClick={() => {
                                                    setHiddenNetworkActivityLinks(prevLinks => prevLinks.includes(label.value) ? prevLinks.filter(link => link !== label.value) : [...prevLinks, label.value])
                                                }}>
                                                <svg width={legendSettings.nodeRadius * 2 + 1.5} height={legendSettings.nodeRadius * 2 + 1.5} style={{ margin: '2px 0' }}>
                                                    <circle
                                                        fill={ display ? theme.palette.text.disabled : label.value }
                                                        stroke={ display ? theme.palette.text.disabled : label.value }
                                                        strokeWidth='1.5'
                                                        r={legendSettings.nodeRadius}
                                                        cx={legendSettings.nodeRadius + 0.75}
                                                        cy={legendSettings.nodeRadius + 0.75}
                                                    />
                                                </svg>
                                                <LegendLabel style={{
                                                        margin: '0 0 0 4px', 
                                                        color: display ? theme.palette.text.disabled : theme.palette.text.primary}}
                                                    >
                                                        {label.text}
                                                    </LegendLabel>
                                            </LegendItem>
                                        )})
                                    }
                                </LegendQuantile>
                            </div>
                        </Grid>
                        <Grid item xs={1} />
                    </Grid>
                }
                
            </Drawer>
            <main className={clsx(classes.content)}>
                <Toolbar />
                <Grid container className={clsx(classes.container)} spacing={3}>
                <Grid item xs={12}>
                <Paper variant="outlined" className={clsx(classes.card, classes.rowTimeline)}>
                    <Grid item xs={12}>
                        <Typography style={{fontSize: '0.8rem'}}>
                            Current selection: {`${brushedStartDateTime.toFormat('MMM dd, yyyy - HH:mm:ss')}`} - {`${brushedEndDateTime.toFormat('MMM dd, yyyy - HH:mm:ss')}`}
                        </Typography>
                    </Grid>
                    <ParentSize>
                        {({width: visWidth, height: visHeight}) => (
                            <EventTimeline
                                width={visWidth}
                                height={visHeight}
                                startDateTime={startDateTime}
                                endDateTime={endDateTime}
                                data={Array.from(dataBuckets).map((d: any) => d[1])}
                                brushedData={Array.from(brushedDataBuckets).map((d: any) => d[1])}
                                customBucketAxisTimeFormat={bucketAxisTimeFormat}
                                onBrushChange={handleBrushChange}
                                onBrushReset={handleBrushReset}
                            />
                        )}
                    </ParentSize>           
                </Paper>   
            </Grid>       
            <Grid item xs={8}>
                <Paper className={clsx(classes.card, classes.rowGraph)}>
                    <ParentSize>
                        {({width: visWidth, height: visHeight}) => (
                            <NetworkChart
                                width={visWidth}
                                height={visHeight}
                                processesData={displayedProcesses}
                                portsData={displayedPorts}
                                filesData={displayedFiles}
                                endpointsData={displayedEndpoints}
                                portLinksData={displayedPortLinks}
                                fileVersionLinksData={displayedFileVersionLinks}
                                networkActivityLinksData={displayedNetworkActivityLinks}
                                hiddenNodeTypes={hiddenNodeTypes}
                                hiddenLinkTypes={hiddenLinkTypes}
                                hiddenHosts={hiddenHosts}
                                hiddenFileVersionLinks={hiddenFileVersionLinks}
                                hiddenNetworkActivityLinks={hiddenNetworkActivityLinks}
                                groupingEnabled={groupingEnabled}
                                hostColorScale={hostColorScale}
                                fileVersionColorScale={fileVersionColorScale}
                                networkActivityColorScale={networkActivityColorScale}
                            />
                        )}
                    </ParentSize>
                </Paper>
            </Grid>

            <Grid item xs={4}>
                <Paper className={clsx(classes.card, classes.rowGraph)}>Details</Paper>
            </Grid>
                </Grid>
            </main>
        </div>
    );
}

function getPortLinkDataArray(ports: Port[], endpoints: Endpoint[], processes: Process[]): any[] {
    const tempPortLinks = [];
    ports.forEach((portNode: Port) => {
        const portLink =  {
            __typename: 'PortLink',
            id: `port_${portNode.portNumber}_of_${portNode.hostName}`,
            source: portNode,
            target: null
        }
        if (portNode.processes) {
            portNode.processes.forEach((processId: string) => {
                portLink.target = processes.filter((process: Process) => processId === process.id)[0];
            })
        } else {
            portLink.target = endpoints.filter((endpoint: Endpoint) => portNode.hostName === endpoint.hostName)[0];
        }
        tempPortLinks.push(portLink);
    });
    return tempPortLinks;
}

function getLinkDataMap(activities: any[], linkType: string, sourceNodes: any[], targetNodes: any[], startTime: DateTime, endTime: DateTime): Map<string, object> {
    const returnMap = new Map(); 
    let overallBytes = 0;
    activities
        .filter((d: any) => d.timestamp > startTime.toMillis() && d.timestamp < endTime.toMillis())
        .forEach((d: any) => {
            const linkId = `${d.source}->${d.target}`;
            overallBytes += d.length ? d.length : d.fileSize;
            let link = returnMap.get(linkId);
            if(!link) {
                returnMap.set(linkId, {
                    id: linkId,
                    __typename: linkType, 
                    target: targetNodes.filter((node: any) => node.id === d.target)[0],
                    source: sourceNodes.filter((node: any) => node.id === d.source)[0],
                    overallLinkBytes: d.length ? d.length : d.fileSize,
                    activities: [d]
                });
            } else {
                link.activities.push(d);
                link.overallLinkBytes += d.length ? d.length : d.fileSize;
                returnMap.set(linkId, link);
            }
        });
    returnMap.forEach((value) => {
        value.byteProportion = value.overallLinkBytes / overallBytes;
    });
    return returnMap;
}

export default App;
