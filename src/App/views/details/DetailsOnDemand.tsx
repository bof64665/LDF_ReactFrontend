import React, { useMemo } from 'react';
import { createStyles, makeStyles, Theme } from '@material-ui/core/styles';
import Card from '@material-ui/core/Card';
import CardHeader from '@material-ui/core/CardHeader';
import Divider from '@material-ui/core/Divider';
import IconButton from '@material-ui/core/IconButton';
import Typography from '@material-ui/core/Typography';
import CloseRounded from '@material-ui/icons/CloseRounded';
import { useAppDispatch, useAppSelector } from "../../../redux/hooks";
import { resetFocusedElement } from '../../../redux/analysisSlice';
import HoverFocusCardContent from './hoverFocusCardContent/HoverFocusCardContent';
import EmptyCardContent from './hoverFocusCardContent/emptyCardContent/EmptyCardContent';

const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        card: {
            padding: theme.spacing(1),
            color: theme.palette.text.secondary,
            height: '70vh',
        },
    }),
);

const DetailsOnDemand = () => {
    const classes = useStyles();
    const dispatch = useAppDispatch();
    const {
        focusedElement
    } = useAppSelector(state => state.analysisSliceReducer);

    const element = useMemo(() => {
        if (focusedElement.id !== '-1') return focusedElement;
        return -1;
    }, [focusedElement]);
    
    return (
        <Card className={classes.card}>
            {
                element !== -1 && (
                    <React.Fragment>
                        <CardHeader 
                            title={
                                <Typography variant='h6'>
                                    {element.__typename.includes('Link') ? element.__typename.slice(0, element.__typename.indexOf('Link')) : element.__typename}
                                </Typography>                  
                            }
                            action={
                                element !==-1 && (
                                    <IconButton 
                                        onClick={() => dispatch(resetFocusedElement())} 
                                        style={{marginTop: '0.7vh'}}
                                        aria-label="close"
                                    >
                                        <CloseRounded />
                                    </IconButton>
                                )
                            }
                        />
                        <Divider />
                    </React.Fragment>
                )
            }
            {
                element === -1 && (
                    <EmptyCardContent />
                )
            }
            {
                (focusedElement.id !== '-1') && (
                    <HoverFocusCardContent data={element} />
                )
            }     
        </Card>  
    );
};

export default DetailsOnDemand;