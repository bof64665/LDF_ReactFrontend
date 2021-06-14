import React, { useState, useEffect } from 'react';
import { gql, useLazyQuery, useQuery } from '@apollo/client';
import { DateTime } from 'luxon';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import Button from "@material-ui/core/Button";
import { useAppDispatch, useAppSelector } from '../../../../redux/hooks';
import { setMinDateTime, setMaxDateTime, setStartDateTime, setEndDateTime, initRawData, setAggregationGranularity } from '../../../../redux/analysisSlice';
import SearchDateTimePicker from './SearchDateTimePicker';
import { cloneDeep } from 'lodash';

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
            dataBuckets {id timestamp count networkActivity {id timestamp source target process length protocol} fileVersion {id timestamp target source fileSize action}}
            networkActivityLookUp {key value}
            networkActivityLinks {id source target overallLinkBytes byteProportion activities {id timestamp source target process length protocol}}
            fileVersionLookUp {key value}
            fileVersionLinks {id source target overallLinkBytes byteProportion versions {id timestamp source target fileSize action}}
  }
}
`;

const SearchParameters = () => {
    const dispatch = useAppDispatch();
    const {
        minDateTime,
        maxDateTime,
        startDateTime,
        endDateTime,
    } = useAppSelector(state => state.analysisSliceReducer);

    const { 
        loading: loadingAvailableDateRange,
        error: errorAvailableDateRange,
        data: availableDateRange } =  useQuery(GET_AVAILABLE_DATA_RANGE);

    useEffect(() => {
        if(!availableDateRange || loadingAvailableDateRange || errorAvailableDateRange) return;
        dispatch(setMinDateTime(availableDateRange.dataAvailability.startTime));
        dispatch(setMaxDateTime(availableDateRange.dataAvailability.endTime));
    }, [loadingAvailableDateRange, errorAvailableDateRange, availableDateRange, dispatch]);

    const [dateSelectionErr, setDateSelectionErr] = useState<boolean>(false);

    const [
        getAnalysisData, 
        {
            loading: loadingAnalysisData, 
            error: errorAnalysisData, 
            data: analysisData}] = useLazyQuery(GET_ANALYSIS_DATA);

    const handleSearch = (startTime: number, endTime: number) => {
        getAnalysisData({variables: {start: startTime, end: endTime}});
    }

    useEffect(() => {
        if(!analysisData || loadingAnalysisData || errorAnalysisData) return;
        dispatch(initRawData(cloneDeep(analysisData.analysisData)));
    }, [analysisData, loadingAnalysisData, errorAnalysisData, dispatch]);

    useEffect(() => {
        const granularity = (endDateTime - startDateTime) / 100;
        dispatch(setAggregationGranularity(granularity));
    }, [dispatch, endDateTime, startDateTime]);

    const handleStartDateTimeChange = (date: DateTime) => {
        dispatch(setStartDateTime(date.toMillis()));
        setDateSelectionErr((date.toMillis() >= minDateTime && date.toMillis() <= endDateTime) ? false : true);
    }

    const handleEndDateTimeChange = (date: DateTime) => {
        dispatch(setEndDateTime(date.toMillis()));
        setDateSelectionErr((date.toMillis() <= maxDateTime && date.toMillis() >= startDateTime) ? false : true);
    }

    return (
        <Grid container spacing={3} style={{marginBottom: '10px', marginTop: '10px'}}>
            <Grid item xs={1} />
            <Grid item xs={10}>
                <Typography variant="overline" color="textSecondary">Search Parameters</Typography>
            </Grid>
            <Grid item xs={1} />

            <Grid item xs={1} />
            <Grid item xs={10}>
                <SearchDateTimePicker 
                minDateTime={DateTime.fromMillis(minDateTime)} 
                maxDateTime={DateTime.fromMillis(endDateTime)} 
                value={DateTime.fromMillis(startDateTime)} 
                minMessage={'No data before'}
                maxMessage={'Needs to be before'}
                handleDateTimeChange={handleStartDateTimeChange} />
            </Grid>
            <Grid item xs={1} />

            <Grid item xs={1} />
            <Grid item xs={10}>
                <SearchDateTimePicker 
                minDateTime={DateTime.fromMillis(startDateTime)}
                maxDateTime={DateTime.fromMillis(maxDateTime)}
                value={DateTime.fromMillis(endDateTime)}
                minMessage={'Needs to be after'}
                maxMessage={'No data after'}
                handleDateTimeChange={handleEndDateTimeChange}/>
            </Grid>
            <Grid item xs={1} />

{/*             <Grid item xs={1} />
            <Grid item xs={10} >
                <AggregationGranularityOptions 
                currentAggregationGranularity = {granularity}
                handleGranularityChange = {handleGranularityChange}/>
            </Grid>
            <Grid item xs={1} /> */}

            <Grid item xs={1} />
            <Grid item xs={10} >
                <Button 
                    variant="contained" 
                    color="secondary" 
                    disabled={dateSelectionErr}
                    size="large"
                    onClick={() => handleSearch(startDateTime, endDateTime)} 
                    style={{ width: '100%', marginTop: '1.5%' }}>
                        Search
                </Button>
            </Grid>
            <Grid item xs={1} />
        </Grid>
    );
}

export default SearchParameters;