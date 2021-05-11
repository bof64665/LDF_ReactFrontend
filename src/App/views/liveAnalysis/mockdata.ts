abstract class CoreNodeType {
    id: string;
    host: string;
}

export class PortNodeType extends CoreNodeType {
    portNumber: string;
    processes?: string[];
}

export class EndpointNodeType extends CoreNodeType {
    hostname: string;
}

export class ProcessNodeType extends CoreNodeType {
    name: string;
}

export class FileNodeType extends CoreNodeType {
    path: string;
    name: string;
    type: string;
}

abstract class CoreLinkType {
    id: string;
    timestamp: number;
    target: string;
    source: string;
}

export class FileVersionType extends CoreLinkType {
    fileSize: number;
}

export class NetworkActivityType extends CoreLinkType {
    protocol: string;
    length: number;
}