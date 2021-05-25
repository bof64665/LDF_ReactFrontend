import React, { useMemo } from 'react';
import { useAppDispatch, useAppSelector } from "../../../redux/hooks";
import Typography from '@material-ui/core/Typography';
import Button from "@material-ui/core/Button";
import { resetHoveredElement, resetFocusedElement } from '../../../redux/analysisSlice';

const DetailsOnDemand = ({
    focus,
}: {
    focus: boolean
}) => {
    const dispatch = useAppDispatch();

    const {
        focusedElement,
        hoveredElement
    } = useAppSelector(state => state.analysisSliceReducer);

    const element = useMemo(() => focus ? focusedElement : hoveredElement, [focus, focusedElement, hoveredElement]);
    
    return (
        <React.Fragment>
            <div>
                <Typography>
                    {element.id}
                </Typography>
            </div>
            {
                focusedElement && (
                    <div>
                        <Button 
                            variant="contained" 
                            color="secondary"
                            size="small"
                            onClick={() => {dispatch(resetFocusedElement()); dispatch(resetHoveredElement())}} 
                            style={{ width: '100%', marginTop: '1.5%' }}>
                                cancel
                        </Button>
                    </div>
                )
            }
        </React.Fragment>  
    );
};

export default DetailsOnDemand;

