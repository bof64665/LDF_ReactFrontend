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
import CloudDownload from '@material-ui/icons/CloudDownload';
import AccountTree from '@material-ui/icons/AccountTree';
import Category from '@material-ui/icons/Category';
import Visibility from '@material-ui/icons/Visibility';
import DeviceHub from '@material-ui/icons/DeviceHub';
import { DataGrid, GridColDef, GridValueFormatterParams, GridColumnHeaderParams, GridCellParams } from '@material-ui/data-grid'
import { DateTime } from 'luxon';
import HoverFocusCardListItem from '../HoverFocusCardListItem';
import Transition from './Transition';
import { useAppSelector } from '../../../../../redux/hooks';

const FileVersionCardContent = ({data}: {data: any}) => {
    const {
        displayedNodes,
    } = useAppSelector( state => state.analysisSliceReducer );

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
            headerName: 'Version ID',
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
            field: 'action',
            headerName: 'Action',
            flex: 1,
            renderHeader: (params: GridColumnHeaderParams) => (
                <strong>{'Performed action'}</strong>
            ),
        },
        {
            field: 'fileSize',
            headerName: 'Size of file',
            width: 150,
            renderHeader: (params: GridColumnHeaderParams) => (
                <strong>{'Size of file'}</strong>
            ),
        },
        {
            field: 'versionDownload',
            headerName: 'View version',
            width: 150,
            renderHeader: (params: GridColumnHeaderParams) => (
                <strong>{'View version'}</strong>
            ),
            renderCell: (params: GridCellParams) => (
                <Button variant="contained" color="primary" startIcon={<CloudDownload />}>Download</Button>
                ),
        }
      ];

    const source = displayedNodes.find((node: any) => node.__typename === 'Process' && node.id === data.source);

    return (
        <React.Fragment>
            <List>
                <HoverFocusCardListItem primary={source.name} secondary='Editing process'><Category /></HoverFocusCardListItem>
                <HoverFocusCardListItem primary={`${data.overallLinkBytes} (${(data.byteProportion * 100).toPrecision(4)}% of all file versions)`} secondary='Bytes flowing over this link'><DeviceHub /></HoverFocusCardListItem>
                <HoverFocusCardListItem primary={`${data.target}`} secondary='Edited file'><AccountTree /></HoverFocusCardListItem>
                <ListItem button onClick={handleClickOpen}> 
                    <ListItemText disableTypography primary={
                            <Typography variant='button' color='secondary'>
                                {`${data.versions.length} ${data.versions.length !== 1 ? 'activities' : 'activity'} on this link`}
                            </Typography>
                        }/>
                    <ListItemSecondaryAction>
                        <IconButton onClick={handleClickOpen} edge="end" aria-label="view">
                        <Visibility color='secondary'/>
                        </IconButton>
                    </ListItemSecondaryAction>
                </ListItem>
            </List>
            <Dialog open={open} onClose={handleClose} TransitionComponent={Transition} keepMounted fullWidth={true} maxWidth={'lg'}>
                <DialogTitle>Versions of <strong>{data.target}</strong> edited by <strong>{data.source.name}</strong></DialogTitle>
                <DialogContent>
                    <div style={{ height: 400, width: '100%' }}>
                        <DataGrid rows={data.versions} columns={columns} pageSize={5} disableColumnMenu />
                    </div>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose} color="primary">Close</Button>
                </DialogActions>
            </Dialog>
        </React.Fragment>  
    );
};

export default FileVersionCardContent;