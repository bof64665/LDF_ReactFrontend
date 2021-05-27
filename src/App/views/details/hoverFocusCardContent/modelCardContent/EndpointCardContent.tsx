import List from '@material-ui/core/List';
import Dns from '@material-ui/icons/Dns';
import Language from '@material-ui/icons/Language';
import { Endpoint } from '../../../../models/Endpoint';
import HoverFocusCardListItem from '../HoverFocusCardListItem';

const EndpointCardContent = ({endpoint}: {endpoint: Endpoint}) => {
    return (
        <List>
            <HoverFocusCardListItem primary={endpoint.hostName} secondary='DNS Name'><Dns /></HoverFocusCardListItem>
            <HoverFocusCardListItem primary={endpoint.hostIp} secondary='IP Adress'><Language /></HoverFocusCardListItem>
        </List>
    )
};

export default EndpointCardContent;