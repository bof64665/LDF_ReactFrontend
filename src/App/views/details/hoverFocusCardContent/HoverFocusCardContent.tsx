import React from 'react';
import CardContent from '@material-ui/core/CardContent';
import Divider from '@material-ui/core/Divider';
import EndpointCardContent from './modelCardContent/EndpointCardContent';
import FileCardContent from './modelCardContent/FileCardContent';
import FileVersionCardContent from './modelCardContent/FileVersionCardContent';
import PortCardContent from './modelCardContent/PortCardContent';
import ProcessCardContent from './modelCardContent/ProcessCardContent';
import NetworkActivityCardContent from './modelCardContent/NetworkActivityCardContent';

const HoverFocusCardContent = ({data}: {data: any}) => {
    return (
        <CardContent>
            { data.__typename === 'Port' && <PortCardContent port={data} /> }
            { data.__typename === 'Process' && <ProcessCardContent process={data} /> }
            { data.__typename === 'EndPoint' && <EndpointCardContent endpoint={data} /> }
            { data.__typename === 'File' && <FileCardContent file={data} /> }
            { data.__typename === 'FileVersionLink' && <FileVersionCardContent data={data} /> }
            { data.__typename === 'NetworkActivityLink' && <NetworkActivityCardContent data={data} /> }
            <Divider />
        </CardContent>
    )
};

export default HoverFocusCardContent;