import List from '@material-ui/core/List';
import Description from '@material-ui/icons/Description';
import Extension from '@material-ui/icons/Extension';
import AccountTree from '@material-ui/icons/AccountTree';
import { File } from '../../../../models/File';
import HoverFocusCardListItem from '../HoverFocusCardListItem';

const FileCardContent = ({file}: {file: File}) => {
    return (
        <List>
            <HoverFocusCardListItem primary={file.name} secondary='File Name'><Description /></HoverFocusCardListItem>
            <HoverFocusCardListItem primary={file.path} secondary='Full Path'><AccountTree /></HoverFocusCardListItem>
            <HoverFocusCardListItem primary={file.type} secondary='File Type'><Extension /></HoverFocusCardListItem>
        </List>
    )
};

export default FileCardContent;