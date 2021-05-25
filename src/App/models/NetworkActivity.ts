export class NetworkActivity {
    id: string;
    timestamp: number;
    target: string;
    source: string;
    protocol: string;
    length: number;
    process?: string;
    __typename: 'NetworkActivity';
}