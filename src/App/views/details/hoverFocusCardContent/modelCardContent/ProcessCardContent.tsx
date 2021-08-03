import List from '@material-ui/core/List';
import Category from '@material-ui/icons/Category';
import ScatterPlot from '@material-ui/icons/ScatterPlot';
import { Process } from '../../../../models/Process';
import HoverFocusCardListItem from '../HoverFocusCardListItem';

const ProcessCardContent = ({process}: {process: Process}) => {
    return (
        <List>
            <HoverFocusCardListItem primary={process.id} secondary='PID'><ScatterPlot /></HoverFocusCardListItem>
            <HoverFocusCardListItem primary={process.name} secondary='Process Name'><Category /></HoverFocusCardListItem>
        </List>
    )
};

export default ProcessCardContent;