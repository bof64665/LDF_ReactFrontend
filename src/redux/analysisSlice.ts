import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { DateTime } from 'luxon';
import { File } from '../App/models/File';
import { Endpoint } from '../App/models/Endpoint';
import { FileVersion } from '../App/models/FileVersion';
import { NetworkActivity } from '../App/models/NetworkActivity';
import { Port } from '../App/models/Port';
import { Process } from '../App/models/Process';
import type { RootState } from './store'
import { cloneDeep } from 'lodash';
import { scaleQuantile } from '@visx/scale';

// Define a type for the slice state
interface AnalysisSlice {
    groupingEnabled: boolean,
    hiddenNodeTypes: string[],
    hiddenLinkTypes: string[],
    hiddenHosts: string[],
    hiddenFileVersionLinks: string[],
    hiddenNetworkActivityLinks: string[],
    focusedElement: any,
    hoveredElement: any;

    minDateTime: number,
    maxDateTime: number,
    aggregationGranularity: number,
    startDateTime: number,
    endDateTime: number,
    brushedStartDateTime: number,
    brushedEndDateTime: number,

    rawPortsData: Port[],
    rawProcessesData: Process[],
    rawFilesData: File[],
    rawEndpointsData: Endpoint[],
    rawNetworkActivityData: NetworkActivity[],
    rawFileVersionData: FileVersion[],

    fileVersionLinkData: any[],
    networkActivityLinkData: any[],
    portLinkData: any[],
    portsData: any[],
    processesData: any[],
    endpointsData: any[],
    filesData: any[],

    displayedNodes: any[],
    displayedLinks: any[],

    activeHosts: string[],
}

// Define the initial state using that type
const initialState: AnalysisSlice = {
    groupingEnabled: false,
    hiddenNodeTypes: [],
    hiddenLinkTypes: [],
    hiddenHosts: [],
    hiddenFileVersionLinks: [],
    hiddenNetworkActivityLinks: [],
    focusedElement: {id: '-1'},
    hoveredElement: {id: '-1'},

    minDateTime: DateTime.now().toMillis(),
    maxDateTime: DateTime.now().toMillis(),
    aggregationGranularity: 60000,
    startDateTime: DateTime.now().toMillis(),
    endDateTime: DateTime.now().toMillis(),
    brushedStartDateTime: DateTime.now().toMillis(),
    brushedEndDateTime: DateTime.now().toMillis(),

    rawPortsData: [],
    rawProcessesData: [],
    rawFilesData: [],
    rawEndpointsData: [],
    rawNetworkActivityData: [],
    rawFileVersionData: [],

    fileVersionLinkData: [],
    networkActivityLinkData: [],
    portLinkData: [],
    portsData: [],
    processesData: [],
    endpointsData: [],
    filesData: [],

    displayedLinks: [],
    displayedNodes: [],

    activeHosts: [],
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

            const {nodes, links} = applyDisplayFilters(state);
            state.displayedLinks = links;
            state.displayedNodes = nodes;
        },

        hideLinkType: (state, action: PayloadAction<string>) => {
            if( state.hiddenLinkTypes.includes(action.payload)) {
                state.hiddenLinkTypes.splice(state.hiddenLinkTypes.indexOf(action.payload), 1);
            } else {
                state.hiddenLinkTypes.push(action.payload);
            }

            const {nodes, links} = applyDisplayFilters(state);
            state.displayedLinks = links;
            state.displayedNodes = nodes;
        },

        hideHost: (state, action: PayloadAction<string>) => {
            if( state.hiddenHosts.includes(action.payload)) {
                state.hiddenHosts.splice(state.hiddenHosts.indexOf(action.payload), 1);
            } else {
                state.hiddenHosts.push(action.payload);
            }

            const {nodes, links} = applyDisplayFilters(state);
            state.displayedLinks = links;
            state.displayedNodes = nodes;
        },
        hideFileVersionLink: (state, action: PayloadAction<string>) => {
            if( state.hiddenFileVersionLinks.includes(action.payload)) {
                state.hiddenFileVersionLinks.splice(state.hiddenFileVersionLinks.indexOf(action.payload), 1);
            } else {
                state.hiddenFileVersionLinks.push(action.payload);
            }

            const {nodes, links} = applyDisplayFilters(state);
            state.displayedLinks = links;
            state.displayedNodes = nodes;
        },
        hideNetworkActivityLink: (state, action: PayloadAction<string>) => {
            if( state.hiddenNetworkActivityLinks.includes(action.payload)) {
                state.hiddenNetworkActivityLinks.splice(state.hiddenNetworkActivityLinks.indexOf(action.payload), 1);
            } else {
                state.hiddenNetworkActivityLinks.push(action.payload);
            }

            const {nodes, links} = applyDisplayFilters(state);
            state.displayedLinks = links;
            state.displayedNodes = nodes;
        },
        setFocusedElement: (state, action: PayloadAction<any>) => {
            state.focusedElement = action.payload
        },
        resetFocusedElement: (state) => {
            state.focusedElement = Object.assign({id: '-1'});
        },
        setHoveredElement: (state, action: PayloadAction<any>) => {
            state.hoveredElement = action.payload
        },
        resetHoveredElement: (state) => {
            state.hoveredElement = Object.assign({id: '-1'});
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
        setBrushBoundaries: (state, action: PayloadAction<{startTimestamp: number, endTimeStamp: number}>) => {
            state.brushedStartDateTime = action.payload.startTimestamp;
            state.brushedEndDateTime = action.payload.endTimeStamp;

            const {nodes, links} = getDisplayedData(state, action.payload.startTimestamp, action.payload.endTimeStamp);
            state.displayedLinks = links;
            state.displayedNodes = nodes;
        },
        setAggregationGranularity: (state, action: PayloadAction<number>) => {
            state.aggregationGranularity = action.payload;
        },
        initRawData: (state, action: PayloadAction<{
            ports: Port[], processes: Process[], files: File[], endpoints: Endpoint[], fileVersions: FileVersion[], networkActivities: NetworkActivity[]
        }>) => {
            state.rawPortsData = action.payload.ports;
            state.rawProcessesData = action.payload.processes;
            state.rawFilesData = action.payload.files;
            state.rawEndpointsData = action.payload.endpoints;
            state.rawFileVersionData = action.payload.fileVersions;
            state.rawNetworkActivityData = action.payload.networkActivities;

            const types = [];
            state.rawEndpointsData.forEach((endpoint: Endpoint) => {
                if(!types.includes(endpoint.hostName)) types.push(endpoint.hostName);
            });
            state.activeHosts = ['localhost', ...types];

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
    setHoveredElement,
    resetHoveredElement, 
    setMinDateTime,
    setMaxDateTime,
    setStartDateTime,
    setEndDateTime,
    setBrushBoundaries,
    setAggregationGranularity, 
    initRawData,
} = analysisSlice.actions

// Other code such as selectors can use the imported `RootState` type
export const selectMinDateTime = (state: RootState) => state.analysisSliceReducer.minDateTime;
export const selectRawFilesData = (state: RootState) => state.analysisSliceReducer.rawFilesData;

export const analysisSliceReducer = analysisSlice.reducer;

function getDisplayedData(state: AnalysisSlice, startTime: number, endTime: number): {nodes: any[], links: any[]} {
    state.fileVersionLinkData = getLinkDataMap(
        state.rawFileVersionData, 
        'FileVersion', 
        state.rawProcessesData, 
        state.rawFilesData, 
        startTime, 
        endTime);

    state.networkActivityLinkData = getLinkDataMap(
        state.rawNetworkActivityData, 
        'NetworkActivity', 
        state.rawPortsData, 
        state.rawPortsData, 
        startTime, 
        endTime);

   let displayedNodeIds = new Set();
   [...state.fileVersionLinkData, ...state.networkActivityLinkData].forEach((link: any) => {
       displayedNodeIds.add(link.target.id);
       displayedNodeIds.add(link.source.id);
   });
   state.filesData = state.rawFilesData.filter((file: File) => Array.from(displayedNodeIds).includes(file.id));
   state.portsData = state.rawPortsData.filter((port: Port) => Array.from(displayedNodeIds).includes(port.id));

   state.portLinkData = getPortLinkDataArray(state.portsData, state.rawEndpointsData, state.rawProcessesData);

   displayedNodeIds = new Set();
   [...state.portLinkData, ...state.fileVersionLinkData].forEach((link: any) => {
        displayedNodeIds.add(link.target.id);
        displayedNodeIds.add(link.source.id);
   });
   state.processesData = state.rawProcessesData.filter((process: Process) => Array.from(displayedNodeIds).includes(process.id));
   state.endpointsData = state.rawEndpointsData.filter((endpoint: Endpoint) => Array.from(displayedNodeIds).includes(endpoint.id));

    return applyDisplayFilters(state);
}

function applyDisplayFilters(state: AnalysisSlice): {nodes: any[], links: any[]} {
    const displayedNodes = [
        ...cloneDeep(state.endpointsData),
        ...cloneDeep(state.filesData), 
        ...cloneDeep(state.portsData), 
        ...cloneDeep(state.processesData)]
            .filter(node => !state.hiddenHosts.includes(node.hostName))
            .filter(node => !state.hiddenNodeTypes.includes(node.__typename));

    const displayedNodeIds = displayedNodes.map((node: any) => node.id);
    const fileVersionColorScale = getLinkQuantileColorScale(state.fileVersionLinkData);
    const networkActivityColorScale = getLinkQuantileColorScale(state.networkActivityLinkData);
    
    const displayedLinks = [...cloneDeep(state.portLinkData), ...cloneDeep(state.fileVersionLinkData), ...cloneDeep(state.networkActivityLinkData)]
        .filter((link: any) => displayedNodeIds.includes(link.source.id) && displayedNodeIds.includes(link.target.id))
        .filter((link: any) => !state.hiddenLinkTypes.includes(link.__typename))
        .map((link: any) => {
            link.source = displayedNodeIds.indexOf(link.source.id);
            link.target = displayedNodeIds.indexOf(link.target.id);
            return link;
        })
        .filter((link: any) => {
            if(link.__typename === 'FileVersion') return !state.hiddenFileVersionLinks.includes(fileVersionColorScale(link.byteProportion));
            if(link.__typename === 'NetworkActivity') return !state.hiddenNetworkActivityLinks.includes(networkActivityColorScale(link.byteProportion));
            return true;
        })

    return {nodes: displayedNodes, links: displayedLinks};
}

function getLinkQuantileColorScale(linkData: any[]) {
    const proportions = linkData.map((link: any) => link.byteProportion)
    return scaleQuantile({
        domain: [Math.min(...proportions), Math.max(...proportions)],
        range: ['#9096f8', '#78f6ef', '#6ce18b', '#f19938', '#eb4d70']
    });
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
                tempPortLinks.push({...portLink});
            })
        } else {
            portLink.target = endpoints.filter((endpoint: Endpoint) => portNode.hostName === endpoint.hostName)[0];
            tempPortLinks.push(portLink);
        }
    });
    return tempPortLinks;
}

function getLinkDataMap(activities: any[], linkType: string, sourceNodes: Array<Process | Port>, targetNodes: Array<File | Port>, startTime: number, endTime: number): any[] {
    const returnMap = new Map(); 
    let overallBytes = 0;
    activities
        .filter((d: any) => d.timestamp > startTime && d.timestamp < endTime)
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
    return Array.from(returnMap).map((d: any) => d[1]);
}