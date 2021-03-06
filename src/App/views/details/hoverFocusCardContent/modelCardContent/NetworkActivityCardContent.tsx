import React, { useState } from 'react';
import Typography from '@material-ui/core/Typography';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import ListItemText from '@material-ui/core/ListItemText';
import IconButton from '@material-ui/core/IconButton';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import ScatterPlot from '@material-ui/icons/ScatterPlot';
import Dns from '@material-ui/icons/Dns';
import Visibility from '@material-ui/icons/Visibility';
import DeviceHub from '@material-ui/icons/DeviceHub';
import { DataGrid, GridColDef, GridValueFormatterParams, GridColumnHeaderParams } from '@material-ui/data-grid'
import { DateTime } from 'luxon';
import HoverFocusCardListItem from '../HoverFocusCardListItem';
import Transition from './Transition';
import { useAppSelector } from '../../../../../redux/hooks';

const NetworkActivityCardContent = ({data}: {data: any}) => {
    const {
        brushedStartDateTime,
        brushedEndDateTime
    } = useAppSelector(state => state.analysisSliceReducer);

    // TODO: for some reason this takes extremly long...
    const activities = data.activities.filter((activity: any ) => activity.timestamp >= brushedStartDateTime && activity.timestamp <= brushedEndDateTime);

    const [open, setOpen] = useState(false);
    const handleClickOpen = () => {
        setOpen(true);
    };
    const handleClose = () => {
    setOpen(false);
    };

    const columns: GridColDef[] = [
        { 
            field: 'id',
            headerName: 'Activity ID',
            width: 145,
            renderHeader: (params: GridColumnHeaderParams) => (
                <strong>{'ID'}</strong>
            ),
        },
        { 
            field: 'timestamp',
            headerName: 'Timestamp', 
            width: 300,
            renderHeader: (params: GridColumnHeaderParams) => (
                <strong>{'Timestamp'}</strong>
            ),
            valueFormatter: (params: GridValueFormatterParams) => DateTime.fromMillis(params.value as number).toFormat('MMM dd, yyyy - HH:mm:ss') 
        },
        { 
            field: 'protocol',
            headerName: 'Protocol',
            width: 100,
            renderHeader: (params: GridColumnHeaderParams) => (
                <strong>{'Protocol'}</strong>
            ),
        },
        {
            field: 'length',
            headerName: 'Package length',
            width: 200,
            renderHeader: (params: GridColumnHeaderParams) => (
                <strong>{'Package length [bytes]'}</strong>
            ),
        },
    ];

    return (
        <React.Fragment>
            <List>
                <HoverFocusCardListItem primary={`${data.source}`} secondary='Source port'><Dns /></HoverFocusCardListItem>
                <HoverFocusCardListItem primary={`${data.overallLinkBytes} (${(data.byteProportion * 100).toPrecision(4)}% of all network activities)`} secondary='Bytes flowing over this link'><DeviceHub /></HoverFocusCardListItem>
                <HoverFocusCardListItem primary={`${data.target}`} secondary='Target port'><ScatterPlot /></HoverFocusCardListItem>
                <ListItem button onClick={handleClickOpen}> 
                        <ListItemText disableTypography primary={
                                <Typography variant='button' color='secondary'>
                                    {`${activities.length} ${activities.length !== 1 ? 'activities' : 'activity'} on this link`}
                                </Typography>
                            }/>
                        <ListItemSecondaryAction>
                            <IconButton onClick={handleClickOpen} edge="end" aria-label="view">
                            <Visibility color='secondary'/>
                            </IconButton>
                        </ListItemSecondaryAction>
                    </ListItem>
            </List>
            <Dialog open={open} onClose={handleClose} TransitionComponent={Transition} keepMounted fullWidth={true} maxWidth={'md'}>
                <DialogTitle>Network Packages from <strong>{data.source}</strong> to <strong>{data.target}</strong></DialogTitle>
                <DialogContent>
                    <div style={{ height: 400, width: '100%' }}>
                        <DataGrid rows={activities} columns={columns} pageSize={5} disableColumnMenu />
                    </div>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose} color="primary">Close</Button>
                </DialogActions>
            </Dialog>
        </React.Fragment>
    )
};

export default NetworkActivityCardContent;