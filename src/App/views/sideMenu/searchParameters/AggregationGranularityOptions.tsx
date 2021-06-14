import React from "react";
import Button from "@material-ui/core/Button";
import ButtonGroup from "@material-ui/core/ButtonGroup";

const AggregationGranularityOptions: React.FunctionComponent<{
    currentAggregationGranularity: number,
    handleGranularityChange(granularity: number): void
}> = ({
    currentAggregationGranularity,
    handleGranularityChange,
}) => {

    const options = [
        {text: '1s', value: 1000},
        {text: '1m', value: 60000},
        {text: '1h', value: 3600000},
        {text: '12h', value: 43200000},
        {text: '24h', value: 86400000},
    ]

    return (
        <ButtonGroup size="large" style={{ width: '100%', marginTop: '5px' }}>
            {options.map(option => (
                <Button 
                key={`granularity-option-${option.text}`}
                color={currentAggregationGranularity === option.value ? "secondary" : "default"} 
                variant="contained" 
                onClick={() => handleGranularityChange(option.value)}>
                    {option.text}
                </Button>
            ))}
            
        </ButtonGroup>
    );
}

export default AggregationGranularityOptions;