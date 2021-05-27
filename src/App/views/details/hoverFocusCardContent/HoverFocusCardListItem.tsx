import React from 'react';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import Typography from '@material-ui/core/Typography';

interface HoverFoucsCardListItemProps {
    primary: string;
    secondary: string;
}

const HoverFocusCardListItem: React.FunctionComponent<HoverFoucsCardListItemProps> = ({children, primary, secondary}: React.PropsWithChildren<HoverFoucsCardListItemProps>) => {
    return (
        <ListItem>
            <ListItemIcon>
                    {children}
            </ListItemIcon>
            <ListItemText disableTypography primary={
                    <Typography style={{fontWeight: 600}}>{primary}</Typography>
                } secondary={
                    <Typography style={{fontSize: '0.72rem'}}>{secondary}</Typography>
                } />
        </ListItem>
    )
}

export default HoverFocusCardListItem;