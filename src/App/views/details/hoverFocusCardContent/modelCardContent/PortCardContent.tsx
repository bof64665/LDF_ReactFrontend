import List from '@material-ui/core/List';
import ScatterPlot from '@material-ui/icons/ScatterPlot';
import Dns from '@material-ui/icons/Dns';
import { Port } from '../../../../models/Port';
import HoverFocusCardListItem from '../HoverFocusCardListItem';

const PortCardContent = ({port}: {port: Port}) => {
    return (
        <List>
            <HoverFocusCardListItem primary={port.portNumber} secondary='Port Number'><ScatterPlot /></HoverFocusCardListItem>
            <HoverFocusCardListItem primary={port.hostName} secondary="Host"><Dns /></HoverFocusCardListItem>
        </List>
    )
};

export default PortCardContent;