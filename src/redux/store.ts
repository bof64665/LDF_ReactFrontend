import {configureStore} from '@reduxjs/toolkit';
import { analysisSliceReducer } from './analysisSlice';

export const filterStore = configureStore({
    reducer: { analysisSliceReducer},
});


export type RootState = ReturnType<typeof filterStore.getState>;
export type AppDispatch = typeof filterStore.dispatch;