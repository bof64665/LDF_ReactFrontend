import React, { useState } from 'react';
import clsx from 'clsx';
import { createStyles, makeStyles, Theme } from '@material-ui/core/styles';
import AppBar from "@material-ui/core/AppBar";
import IconButton from "@material-ui/core/IconButton";
import Toolbar from "@material-ui/core/Toolbar";
import Typography from '@material-ui/core/Typography';
import Divider from '@material-ui/core/Divider';
import Drawer from '@material-ui/core/Drawer';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import List from '@material-ui/core/List';
import MenuIcon from '@material-ui/icons/Menu';
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft';
import DashboardIcon from '@material-ui/icons/Dashboard';
import GroupIcon from '@material-ui/icons/Group';

const drawerWidth = 240;

const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        appBar: {
            zIndex: theme.zIndex.drawer + 1,
            transition: theme.transitions.create(['width', 'margin'], {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.leavingScreen,
            }),
        },
        menuButton: {
            marginRight: 36,
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
            transition: theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
            }),
        },
        drawerClose: {
            transition: theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.leavingScreen,
            }),
            overflowX: 'hidden',
            width: theme.spacing(7) + 1,
            [theme.breakpoints.up('sm')]: {
                width: theme.spacing(9) + 1,
            },
        },
        listItemIcon: {
            paddingLeft: theme.spacing(1.25)
        },
        activeDashboardIcon: {
            color: theme.palette.primary.main
        },
        activeQuantityIcon: {
            color: theme.palette.success.main
        },
        activeQualityIcon: {
            color: theme.palette.secondary.main
        },
    }),
);

interface NavigationProps {
    selectedView: number,
    handleViewChange(index: number): void
}

export default function Navigation(props: NavigationProps) {
    const classes = useStyles();

    const [drawerOpen, setDrawerOpen] = useState(false);

    const handleMenuItemClick = (
        event: React.MouseEvent<HTMLDivElement, MouseEvent>,
        index: number
    ) => {
        props.handleViewChange(index);
    };
    const handleDrawerOpen = (): void => {
        setDrawerOpen(true);
    };
    const handleDrawerClose = (): void => {
        setDrawerOpen(false);
    };

    return (
        <React.Fragment>
            <AppBar position="fixed" className={clsx(classes.appBar)}>
                <Toolbar>
                    { !drawerOpen && <IconButton edge="start" color="inherit" aria-label="open drawer" onClick={handleDrawerOpen} className={clsx(classes.menuButton)}>
                        <MenuIcon/>
                    </IconButton> }
                    { drawerOpen && <IconButton edge="start" color="inherit" aria-label="close drawer" onClick={handleDrawerClose} className={clsx(classes.menuButton)}>
                        <ChevronLeftIcon/>
                    </IconButton> }
                    <Typography variant="h6" noWrap>
                        Visual Decision Support for Live Digital Forensics
                    </Typography>
                    
                </Toolbar>
            </AppBar>
            <Drawer
                variant="permanent"
                className={clsx(classes.drawer, {[classes.drawerOpen]: drawerOpen, [classes.drawerClose]: !drawerOpen})}
                classes={{paper: clsx({[classes.drawerOpen]: drawerOpen, [classes.drawerClose]: !drawerOpen})}}>
                <Toolbar />
                <List component="nav" aria-labelledby="quantitative-analysis-list-nav">
                    <ListItem button onClick={(event) => handleMenuItemClick(event, 0)}  selected={props.selectedView === 0}>
                        <ListItemIcon className={clsx(classes.listItemIcon, {[classes.activeDashboardIcon]: props.selectedView === 0})}>
                            <DashboardIcon />
                        </ListItemIcon>
                        { drawerOpen && <ListItemText primary="Live Analysis" /> }
                    </ListItem>
                    <Divider />
                    <ListItem button onClick={(event) => handleMenuItemClick(event, 1)} selected={props.selectedView === 1}>
                        <ListItemIcon className={clsx(classes.listItemIcon, {[classes.activeQuantityIcon]: props.selectedView === 1})}>
                            <GroupIcon />
                        </ListItemIcon>
                        { drawerOpen && <ListItemText primary="Tool Selection" /> }
                    </ListItem>
                </List>
            </Drawer>
        </React.Fragment>
    )
}
