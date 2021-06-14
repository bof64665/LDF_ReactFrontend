import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { DateTime } from 'luxon';
import { File } from '../App/models/File';
import { Endpoint } from '../App/models/Endpoint';
import { FileVersion } from '../App/models/FileVersion';
import { NetworkActivity } from '../App/models/NetworkActivity';
import { Port } from '../App/models/Port';
import { Process } from '../App/models/Process';
import { scaleQuantile } from '@visx/scale';

// Define a type for the slice state
interface AnalysisSlice {
    groupingEnabled: boolean,
    hiddenNodeTypes: string[],
    hiddenLinkTypes: string[],
    hiddenHosts: string[],
    activeHosts: string[],
    hiddenFileVersionLinks: string[],
    hiddenNetworkActivityLinks: string[],
    focusedElement: any,

    minDateTime: number,
    maxDateTime: number,
    aggregationGranularity: number,
    startDateTime: number,
    endDateTime: number,
    brushedStartDateTime: number,
    brushedEndDateTime: number,

    dataBuckets: any[],
    brushedBuckets: any[],

    fileVersionLinkData: any[],
    networkActivityLinkData: any[],

    displayedNodes: any[],
    displayedLinks: any[],
}

// Define the initial state using that type
const initialState: AnalysisSlice = {
    groupingEnabled: true,
    hiddenNodeTypes: [],
    hiddenLinkTypes: [],
    activeHosts: [],
    hiddenHosts: [],
    hiddenFileVersionLinks: [],
    hiddenNetworkActivityLinks: [],
    focusedElement: {id: '-1'},

    minDateTime: DateTime.now().toMillis(),
    maxDateTime: DateTime.now().toMillis(),
    aggregationGranularity: 86400000,
    startDateTime: DateTime.now().toMillis(),
    endDateTime: DateTime.now().toMillis(),
    brushedStartDateTime: DateTime.now().toMillis(),
    brushedEndDateTime: DateTime.now().toMillis(),

    dataBuckets: [],
    brushedBuckets: [],

    fileVersionLinkData: [],
    networkActivityLinkData: [],

    displayedLinks: [],
    displayedNodes: [],
}

type ApiData = {
    ports: Port[],
    processes: Process[],
    files: File[],
    endpoints: Endpoint[],
    networkActivity: NetworkActivity[],
    fileVersion: FileVersion[]
}

type ActiveData = {
    ports: Port[],
    processes: Process[],
    files: File[],
    endpoints: Endpoint[],
    networkActivity: NetworkActivity[],
    fileVersion: FileVersion[],
    portLink: any[],
}

const rawData: ApiData = {
    ports: [],
    processes: [],
    files: [],
    endpoints: [],
    networkActivity: [],
    fileVersion: [],
}

const activeData: ActiveData = {
    ports: [],
    processes: [],
    files: [],
    endpoints: [],
    networkActivity: [],
    fileVersion: [],
    portLink: [],
}

type LookUps = {
    networkActivity: Map<string, number[]>,
    fileVersion: Map<string, number[]>
}

const lookUpMaps: LookUps = {
    networkActivity: new Map<string, number[]>(),
    fileVersion: new Map<string, number[]>(),
}

export const analysisSlice = createSlice({
    name: 'filter',
    // `createSlice` will infer the state type from the `initialState` argument
    initialState,
    reducers: {
        enableGrouping: (state) => {
            state.groupingEnabled = !state.groupingEnabled
        },

        hideNodeType: (state, action: PayloadAction<string>) => {
            if( state.hiddenNodeTypes.includes(action.payload)) {
                state.hiddenNodeTypes.splice(state.hiddenNodeTypes.indexOf(action.payload), 1);
            } else {
                state.hiddenNodeTypes.push(action.payload);
            }

            const {nodes, links} = getDisplayedData(state);
            state.displayedLinks = links;
            state.displayedNodes = nodes;
        },

        hideLinkType: (state, action: PayloadAction<string>) => {
            if( state.hiddenLinkTypes.includes(action.payload)) {
                state.hiddenLinkTypes.splice(state.hiddenLinkTypes.indexOf(action.payload), 1);
            } else {
                state.hiddenLinkTypes.push(action.payload);
            }

            const {nodes, links} = getDisplayedData(state);
            state.displayedLinks = links;
            state.displayedNodes = nodes;
        },

        hideHost: (state, action: PayloadAction<string>) => {
            if( state.hiddenHosts.includes(action.payload)) {
                state.hiddenHosts.splice(state.hiddenHosts.indexOf(action.payload), 1);
            } else {
                state.hiddenHosts.push(action.payload);
            }

            const {nodes, links} = getDisplayedData(state);
            state.displayedLinks = links;
            state.displayedNodes = nodes;
        },
        hideFileVersionLink: (state, action: PayloadAction<string>) => {
            if( state.hiddenFileVersionLinks.includes(action.payload)) {
                state.hiddenFileVersionLinks.splice(state.hiddenFileVersionLinks.indexOf(action.payload), 1);
            } else {
                state.hiddenFileVersionLinks.push(action.payload);
            }

            const {nodes, links} = getDisplayedData(state);
            state.displayedLinks = links;
            state.displayedNodes = nodes;
        },
        hideNetworkActivityLink: (state, action: PayloadAction<string>) => {
            if( state.hiddenNetworkActivityLinks.includes(action.payload)) {
                state.hiddenNetworkActivityLinks.splice(state.hiddenNetworkActivityLinks.indexOf(action.payload), 1);
            } else {
                state.hiddenNetworkActivityLinks.push(action.payload);
            }

            const {nodes, links} = getDisplayedData(state);
            state.displayedLinks = links;
            state.displayedNodes = nodes;
        },
        setFocusedElement: (state, action: PayloadAction<any>) => {
            if (!action.payload) return;
            state.focusedElement = action.payload
        },
        resetFocusedElement: (state) => {
            state.focusedElement = Object.assign({id: '-1'});
        },
        setMinDateTime: (state, action: PayloadAction<number>) => {
            state.minDateTime = action.payload;
            state.startDateTime = action.payload;
            state.brushedStartDateTime = action.payload;
        },
        setMaxDateTime: (state, action: PayloadAction<number>) => {
            state.maxDateTime = action.payload;
            state.endDateTime = action.payload;
            state.brushedEndDateTime = action.payload;
        },
        setStartDateTime: (state, action: PayloadAction<number>) => {
            state.startDateTime = action.payload;
            state.brushedStartDateTime = action.payload;
        },
        setEndDateTime: (state, action: PayloadAction<number>) => {
            state.endDateTime = action.payload;
            state.brushedEndDateTime = action.payload;
        },
        setBrush: (state, action: PayloadAction<{startTimestamp: number, endTimeStamp: number, buckets: any}>) => {
            state.brushedStartDateTime = action.payload.startTimestamp;
            state.brushedEndDateTime = action.payload.endTimeStamp;
            state.brushedBuckets = action.payload.buckets;

            const {nodes, links} = getDisplayedData(state, action.payload.startTimestamp, action.payload.endTimeStamp);
            state.displayedLinks = links;
            state.displayedNodes = nodes;
        },
        setAggregationGranularity: (state, action: PayloadAction<number>) => {
            state.aggregationGranularity = action.payload;
        },
        initRawData: (state, action: PayloadAction<{
            ports: Port[],
            processes: Process[],
            files: File[],
            endpoints: Endpoint[],
            dataBuckets: any[],
            fileVersions: FileVersion[],
            fileVersionLinks: any[];
            fileVersionLookUp: any[];
            networkActivities: NetworkActivity[],
            networkActivityLinks: any[];
            networkActivityLookUp: any[];
        }>) => {
            rawData.ports = action.payload.ports;
            rawData.processes = action.payload.processes;
            rawData.files = action.payload.files;
            rawData.endpoints = action.payload.endpoints;
            rawData.fileVersion = action.payload.fileVersions;
            state.fileVersionLinkData = action.payload.fileVersionLinks;
            rawData.networkActivity = action.payload.networkActivities;
            state.networkActivityLinkData = action.payload.networkActivityLinks;
            state.dataBuckets = action.payload.dataBuckets;

            action.payload.fileVersionLookUp.forEach((d: {key: string, value: number[]}) => {
                lookUpMaps.fileVersion.set(d.key, d.value);
            });

            action.payload.networkActivityLookUp.forEach((d: {key: string, value: number[]}) => {
                lookUpMaps.networkActivity.set(d.key, d.value);
            });

            const types: Set<string> = new Set<string>();
            rawData.endpoints.forEach((endpoint: Endpoint) => {
                types.add(endpoint.hostIp);
            });
            state.activeHosts = ['10.0.0.3', ...Array.from(types).sort()];

            const {nodes, links} = getDisplayedData(state, state.startDateTime, state.endDateTime);
            state.displayedLinks = links;
            state.displayedNodes = nodes;
        },
    },
})

export const {
    enableGrouping, 
    hideNodeType,
    hideLinkType,
    hideHost,
    hideFileVersionLink,
    hideNetworkActivityLink,
    setFocusedElement,
    resetFocusedElement,
    setMinDateTime,
    setMaxDateTime,
    setStartDateTime,
    setEndDateTime,
    setBrush,
    setAggregationGranularity, 
    initRawData,
} = analysisSlice.actions

export const analysisSliceReducer = analysisSlice.reducer;



function getDisplayedData(state: AnalysisSlice, startTime?: number, endTime?: number): {nodes: any[], links: any[]} {
    const startTimeHash = startTime ? Math.floor(startTime / state.aggregationGranularity) : Math.floor(state.startDateTime / state.aggregationGranularity);
    const endTimeHash = endTime ? Math.floor(endTime / state.aggregationGranularity) : Math.floor(state.endDateTime / state.aggregationGranularity);
    
    activeData.fileVersion = [];
    state.fileVersionLinkData.forEach((link: any) => {
        if(lookUpMaps.fileVersion.get(link.id).filter((d: any) => d >= startTimeHash && d <= endTimeHash).length > 0) {
            activeData.fileVersion.push(link);
        }
    });

    activeData.networkActivity = [];
    state.networkActivityLinkData.forEach((link: any) => {
        if (lookUpMaps.networkActivity.get(link.id).filter((d: any) => d >= startTimeHash && d <= endTimeHash).length > 0) {
            activeData.networkActivity.push(link);
        }
    });

   let activeNodeIds: Set<string> = new Set<string>();
   [...activeData.fileVersion, ...activeData.networkActivity].forEach((link: any) => {
       activeNodeIds.add(link.target);
       activeNodeIds.add(link.source);
   });
   activeData.files = rawData.files.filter((file: File) => activeNodeIds.has(file.id));
   activeData.ports = rawData.ports.filter((port: Port) => activeNodeIds.has(port.id));

   rawData.ports.filter((port: Port) => port.processes).forEach((port: Port) => activeData.ports.push(port));

   activeData.ports.forEach((port: Port) => {
       if(port.processes) {
           port.processes.forEach((pid: string) => {
               activeData.portLink.push({
                   __typename: 'PortLink',
                   id: `port_${port.id}-${pid}`,
                   target: port.id,
                   source: pid
               });
           });
       } else {
           activeNodeIds.add(port.hostName);
       }
   });

   [...activeData.fileVersion, ...activeData.portLink].forEach((link: any) => {
        activeNodeIds.add(link.target);
        activeNodeIds.add(link.source);
   });

   activeData.processes = rawData.processes.filter((process: Process) => activeNodeIds.has(process.id));
   activeData.endpoints = rawData.endpoints.filter((endpoint: Endpoint) => activeNodeIds.has(endpoint.id));

    return applyDisplayFilters(state);
}

function applyDisplayFilters(state: AnalysisSlice): {nodes: any[], links: any[]} {
    const displayedNodes = [
        ...activeData.endpoints,
        ...activeData.files, 
        ...activeData.ports, 
        ...activeData.processes]
            .filter(node => !state.hiddenHosts.includes(node.hostName))
            .filter(node => !state.hiddenNodeTypes.includes(node.__typename));

    const displayedNodeIds = displayedNodes.map((node: any) => node.id);
    const fileVersionColorScale = getLinkQuantileColorScale(state.fileVersionLinkData);
    const networkActivityColorScale = getLinkQuantileColorScale(state.networkActivityLinkData);
    
    const displayedLinks = [...activeData.portLink, ...activeData.fileVersion, ...activeData.networkActivity]
        .filter((link: any) => displayedNodeIds.includes(link.source) && displayedNodeIds.includes(link.target))
        .filter((link: any) => !state.hiddenLinkTypes.includes(link.__typename))
        .filter((link: any) => {
            if(link.__typename === 'FileVersionLink') return !state.hiddenFileVersionLinks.includes(fileVersionColorScale(link.byteProportion));
            if(link.__typename === 'NetworkActivityLink') return !state.hiddenNetworkActivityLinks.includes(networkActivityColorScale(link.byteProportion));
            return true;
        });

    return {nodes: displayedNodes, links: displayedLinks};
}

function getLinkQuantileColorScale(linkData: any[]) {
    const proportions = linkData.map((link: any) => link.byteProportion);
    return scaleQuantile({
        domain: [Math.min(...proportions), Math.max(...proportions)],
        range: ['#9096f8', '#78f6ef', '#6ce18b', '#f19938', '#eb4d70']
    });
}