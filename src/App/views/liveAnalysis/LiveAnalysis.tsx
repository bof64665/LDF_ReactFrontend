import { useState, useEffect, useCallback } from 'react';
import clsx from "clsx";
import {createStyles, makeStyles, Theme} from "@material-ui/core/styles";
import Grid from "@material-ui/core/Grid";
import Paper from "@material-ui/core/Paper";
import IconButton from "@material-ui/core/IconButton";
import Button from "@material-ui/core/Button";
import ButtonGroup from "@material-ui/core/ButtonGroup";
import InputAdornment from "@material-ui/core/InputAdornment";
import Typography from '@material-ui/core/Typography';
import Today from "@material-ui/icons/Today";
import Event from "@material-ui/icons/Event";
import { DateTimePicker } from '@material-ui/pickers';
import { DateTime } from 'luxon';
import { gql, useLazyQuery, useQuery } from '@apollo/client';
import { Bounds } from '@visx/brush/lib/types';
import ParentSize from "@visx/responsive/lib/components/ParentSize";
import EventTimeline from "./EventTimeline";
import NetworkChart from "./NetworkChart";
import { PortNodeType, ProcessNodeType, FileNodeType, EndpointNodeType, FileVersionType, NetworkActivityType } from './mockdata';
import { cloneDeep } from 'lodash';
import { timeFormat } from 'd3';

const GET_AVAILABLE_DATA_RANGE = gql`
    query GetDataAvailability {
        dataAvailability {
            startTime
            endTime
        }
    }
`

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
`

//custom styles
const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        card: {
            padding: theme.spacing(1),
            color: theme.palette.text.secondary,
            textAlign: 'center',
        },
        rowParameters: {
            paddingTop: '1.5vh',
            height: '9vh'
        },
        rowTimeline: {
            height: '12vh'
        },
        rowGraph: {
            height: '60vh',
        },
        rowAdditionals: {
            height: '20vh',
        }, 
    }),
);

export default function LiveAnalysis({width, height}: any) {
    const classes = useStyles();

    const [maxDateTime, setMaxDateTime] = useState<DateTime>(DateTime.now());
    const [minDateTime, setMinDateTime] = useState<DateTime>(maxDateTime.minus({days: 1}));
    const [startDateTime, setStartDateTime] = useState<DateTime>(minDateTime);
    const [endDateTime, setEndDateTime] = useState<DateTime>(maxDateTime);
    const [brushedStartDateTime, setBrushedStartDateTime] = useState<DateTime>(startDateTime);
    const [brushedEndDateTime, setBrushedEndDateTime] = useState<DateTime>(endDateTime);
    const [dateSelectionErr, setDateSelectionErr] = useState<boolean>(false);
    const [aggregationGranularity, setAggregationGranularity] = useState<number>(60000);

    const [ports, setPorts] = useState<PortNodeType[]>([]);
    const [processes, setProcesses] = useState<ProcessNodeType[]>([]);
    const [files, setFiles] = useState<FileNodeType[]>([]);
    const [endpoints, setEndpoints] = useState<EndpointNodeType[]>([]);
    const [fileVersions, setFileVersions] = useState<FileVersionType[]>([]);
    const [networkActivities, setNetworkActivities] = useState<NetworkActivityType[]>([]);

    const [portLinks, setPortLinks] = useState<{id: string, target: PortNodeType, source: ProcessNodeType | EndpointNodeType}[]>([]);
    const [fileVersionLinks, setFileVersionLinks] = useState<any[]>([]);
    const [networkActivityLinks, setNetworkActivityLinks] = useState<any[]>([]);

    const [dataBuckets, setDataBuckets] = useState<Map<number, any>>(new Map());
    const [brushedDataBuckets, setBrushedDataBuckets] = useState<Map<number, any>>(new Map());

    const { loading: loadingAvailableDateRange, error: errorAvailableDateRange, data: availableDateRange } = 
        useQuery(GET_AVAILABLE_DATA_RANGE, {pollInterval: 50000});

    const  [getAnalysisData, {loading: loadingAnalysisData, error: errorAnalysisData, data: analysisData}] = 
        useLazyQuery(GET_ANALYSIS_DATA, {pollInterval: 50000});

    const bucketAxisTimeFormat = (date: any) => {
        const startDateTime = DateTime.fromMillis(date);
        const endDateTime = startDateTime.plus({milliseconds: aggregationGranularity});
        return timeFormat(`${startDateTime.toFormat('dd.LL, HH:mm:ss')} - ${endDateTime.toFormat('dd.LL, HH:mm:ss')}`)
    }

    useEffect(() => {
        if(!availableDateRange || loadingAvailableDateRange || errorAvailableDateRange) return;
        setMinDateTime(DateTime.fromMillis(availableDateRange.dataAvailability.startTime));
        setMaxDateTime(DateTime.fromMillis(availableDateRange.dataAvailability.endTime));
    }, [loadingAvailableDateRange, errorAvailableDateRange, availableDateRange]);

    useEffect(() => {
        setDateSelectionErr(false);
        setStartDateTime(minDateTime);
        setEndDateTime(maxDateTime);
    }, [minDateTime, maxDateTime]);

    useEffect(() => {
        setBrushedStartDateTime(startDateTime);
        setBrushedEndDateTime(endDateTime);
    }, [startDateTime, endDateTime]);

    const handleSearch = useCallback(
        () => {
           getAnalysisData({variables: {start: startDateTime.toMillis(), end: endDateTime.toMillis()}});
        },
        [getAnalysisData, startDateTime, endDateTime],
    );

    useEffect(() => {
        if(!analysisData || loadingAnalysisData || errorAnalysisData) return;
        setPorts(cloneDeep(analysisData.analysisData.ports));
        setProcesses(cloneDeep(analysisData.analysisData.processes));
        setFiles(cloneDeep(analysisData.analysisData.files));
        setEndpoints(cloneDeep(analysisData.analysisData.endpoints));
        setFileVersions(cloneDeep(analysisData.analysisData.fileVersions));
        setNetworkActivities(cloneDeep(analysisData.analysisData.networkActivities));
    }, [analysisData, loadingAnalysisData, errorAnalysisData])

    useEffect(() => {
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
        setPortLinks(getPortLinkDataArray(ports, endpoints, processes));
    }, [endpoints, ports, processes]);

    useEffect(() => {
        setFileVersionLinks(
            Array
                .from(getLinkDataMap(fileVersions, processes, files, brushedStartDateTime, brushedEndDateTime))
                .map((d: any) => d[1]));
    }, [brushedEndDateTime, brushedStartDateTime, fileVersions, files, processes]);

    useEffect(() => {
        setNetworkActivityLinks(
            Array
                .from(getLinkDataMap(networkActivities, ports, ports, brushedStartDateTime, brushedEndDateTime))
                .map((d: any) => d[1]));
    }, [brushedEndDateTime, brushedStartDateTime, ports, networkActivities]);

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
        [...fileVersions, ...networkActivities].forEach((activity: any) => {
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
        <Grid container spacing={3} style={{width: width, height: height}}>
            {/* Parameters */}
            <Grid item xs={12}>
                <Paper variant="outlined" className={clsx(classes.rowParameters, classes.card)}>
                    <Grid item xs={12} container>
                        <Grid item xs={3} >
                            <DateTimePicker 
                                label="Start" 
                                inputVariant="outlined"
                                variant="inline"
                                style={{ width: '90%' }}
                                ampm={false}
                                disableFuture={true}
                                format="MMM dd, yyyy - HH:mm"
                                strictCompareDates={true}
                                minDate={minDateTime}
                                minDateMessage={`No data before ${minDateTime.toFormat('MMM dd, yyyy - HH:mm')}`}
                                maxDate={endDateTime}
                                maxDateMessage={`Needs to be before ${endDateTime.toFormat('MMM dd, yyyy - HH:mm')}`}
                                value={startDateTime} 
                                onChange={(date: any) => {
                                    setStartDateTime(date);
                                    setDateSelectionErr((date >= minDateTime && date <= endDateTime) ? false : true);
                                }}
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton>
                                                <Today />
                                            </IconButton>
                                        </InputAdornment>
                                    )
                                }}
                            />
                        </Grid>
                        <Grid item xs={3}>
                            <DateTimePicker 
                                    label="End" 
                                    inputVariant="outlined"
                                    variant="inline"
                                    style={{ width: '90%' }}
                                    ampm={false}
                                    disableFuture={true}
                                    format="MMM dd, yyyy - HH:mm"
                                    strictCompareDates={true}
                                    minDate={startDateTime}
                                    minDateMessage={`Needs to be after ${startDateTime.toFormat('MMM dd, yyyy - HH:mm')}`}
                                    maxDate={maxDateTime}
                                    maxDateMessage={`No data after ${maxDateTime.toFormat('MMM dd, yyyy - HH:mm')}`}
                                    value={endDateTime} 
                                    onChange={(date: any) => {
                                        setEndDateTime(date);
                                        setDateSelectionErr((date <= maxDateTime && date >= startDateTime) ? false : true);
                                    }}
                                    InputProps={{
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton>
                                                    <Event />
                                                </IconButton>
                                            </InputAdornment>
                                        )
                                    }}
                                />
                            </Grid>
                        <Grid item xs={3}>
                            <ButtonGroup size="large" style={{ width: '90%', marginTop: '1.5%' }}>
                                <Button color={aggregationGranularity === 1000 ? "primary" : "default"} variant="contained" onClick={() => setAggregationGranularity(1000)}>1s</Button>
                                <Button color={aggregationGranularity === 60000 ? "primary" : "default"} variant="contained" onClick={() => setAggregationGranularity(60000)}>1m</Button>
                                <Button color={aggregationGranularity === 3600000 ? "primary" : "default"} variant="contained" onClick={() => setAggregationGranularity(3600000)}>1h</Button>
                                <Button color={aggregationGranularity === 43200000 ? "primary" : "default"} variant="contained" onClick={() => setAggregationGranularity(43200000)}>12h</Button>
                                <Button color={aggregationGranularity === 86400000 ? "primary" : "default"} variant="contained" onClick={() => setAggregationGranularity(86400000)}>24h</Button>
                            </ButtonGroup>
                        </Grid>
                        <Grid item xs={3}>
                            <Button variant="contained" color="primary" disabled={dateSelectionErr} size="large" style={{ width: '90%', marginTop: '1.5%' }} onClick={handleSearch}>
                                Search
                            </Button>
                        </Grid>
                    </Grid>
                </Paper>
            </Grid>
            {/* Brush */}
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
                    Graph
                    <ParentSize>
                        {({width: visWidth, height: visHeight}) => (
                            <NetworkChart
                                width={visWidth}
                                height={visHeight}
                                processNodes={processes}
                                portNodes={ports}
                                fileNodes={files}
                                endpointNodes={endpoints}
                                portLinks={portLinks}
                                fileVersionLinks={fileVersionLinks}
                                networkActivityLinks={networkActivityLinks}
                            />
                        )}
                    </ParentSize>
                </Paper>
            </Grid>

            <Grid item xs={4}>
                <Paper className={clsx(classes.card, classes.rowGraph)}>Details</Paper>
            </Grid>

{/*             <Grid item xs={4}>
                <Paper className={clsx(classes.card, classes.rowAdditionals)}>Additional #1</Paper>
            </Grid>

            <Grid item xs={4}>
            <Paper className={clsx(classes.card, classes.rowAdditionals)}>Additional #2</Paper>
            </Grid>

            <Grid item xs={4}>
                <Paper className={clsx(classes.card, classes.rowAdditionals)}>Additional #3</Paper>
            </Grid> */}
        </Grid>
    )
}

function getPortLinkDataArray(ports: PortNodeType[], endpoints: EndpointNodeType[], processes: ProcessNodeType[]): any[] {
    const tempPortLinks = [];
    ports.forEach((portNode: any) => {
        const portLink =  {
            id: `port_${portNode.portNumber}_of_${portNode.hostName}`,
            source: portNode,
            target: null
        }
        if (portNode.processes) {
            portNode.processes.forEach((processId: string) => {
                portLink.target = processes.filter((process: any) => processId === process.id)[0];
            })
        } else {
            portLink.target = endpoints.filter((endpoint: any) => portNode.hostName === endpoint.hostName)[0];
        }
        tempPortLinks.push(portLink);
    });
    return tempPortLinks;
}

function getLinkDataMap(activities: any[], sourceNodes: any[], targetNodes: any[], startTime: DateTime, endTime: DateTime): Map<string, object> {
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
                    target: targetNodes.filter((node: any) => node.id === d.target)[0],
                    source: sourceNodes.filter((node: any) => node.id === d.source)[0],
                    overallLinkBytes: d.length ? d.length : d.fileSize,
                    byteProportion: d.length ?  d.length / overallBytes : d.fileSize / overallBytes,
                    activities: [d]
                });
            } else {
                link.overallLinkBytes += d.length ? d.length : d.fileSize;
                link.byteProportion = link.overallLinkBytes / overallBytes;
                link.activities.push(d);
                returnMap.set(linkId, link);
            }
        });
    return returnMap;
}