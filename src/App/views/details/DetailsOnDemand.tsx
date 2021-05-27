import { useMemo } from 'react';
import { createStyles, makeStyles, Theme } from '@material-ui/core/styles';
import Card from '@material-ui/core/Card';
import CardHeader from '@material-ui/core/CardHeader';
import Divider from '@material-ui/core/Divider';
import IconButton from '@material-ui/core/IconButton';
import Typography from '@material-ui/core/Typography';
import CloseRounded from '@material-ui/icons/CloseRounded';
import { useAppDispatch, useAppSelector } from "../../../redux/hooks";
import { resetHoveredElement, resetFocusedElement } from '../../../redux/analysisSlice';
import HoverFocusCardContent from './hoverFocusCardContent/HoverFocusCardContent';
import EmptyCardContent from './hoverFocusCardContent/emptyCardContent/EmptyCardContent';

const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        card: {
            padding: theme.spacing(1),
            color: theme.palette.text.secondary,
            height: '69vh',
        },
    }),
);

const DetailsOnDemand = () => {
    const classes = useStyles();
    const dispatch = useAppDispatch();
    const {
        focusedElement,
        hoveredElement
    } = useAppSelector(state => state.analysisSliceReducer);

    const element = useMemo(() => {
        if (focusedElement.id !== '-1') return focusedElement;
        if (hoveredElement.id !== '-1') return hoveredElement;
        return -1;
    }, [focusedElement, hoveredElement]);
    
    return (
        <Card className={classes.card}>
            <CardHeader 
                title={
                    <Typography style={{fontWeight: 550, fontSize: '1.2rem'}}>
                        {element === -1 ? 'Additional Information' : element.id}
                    </Typography>                  
                }
                subheader={
                    <Typography variant='overline'>
                        {element === -1 ? 'Hover or click an node or link for more information' : element.__typename}
                    </Typography>
                }
                action={
                    element !==-1 && (
                        <IconButton 
                            onClick={() => {dispatch(resetFocusedElement()); dispatch(resetHoveredElement())}} 
                            style={{marginTop: '0.7vh'}}
                            aria-label="close"
                        >
                            <CloseRounded />
                        </IconButton>
                    )
                  }
            />
            <Divider />
            {
                element === -1 && (
                    <EmptyCardContent />
                )
            }
            {
                (focusedElement.id !== '-1' || hoveredElement.id !== '-1') && (
                    <HoverFocusCardContent data={element} />
                )
            }     
        </Card>  
    );
};

export default DetailsOnDemand;